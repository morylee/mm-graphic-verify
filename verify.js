(function(win, doc) {

	function getSelfTag () {
		var scripts = doc.getElementsByTagName('script');
		return scripts[scripts.length - 1];
	}
	function getSelfPath (scriptTag) {
		var scriptTagSrc = scriptTag.src;
		var scriptTagName = scriptTagSrc.split('/')[scriptTagSrc.split('/').length - 1];
		return scriptTagSrc.replace(scriptTagName, '');
	}
	function importPlugins () {
		var scriptTag = getSelfTag();
		var scriptPath = getSelfPath(scriptTag);
		
		var cryptojs = doc.createElement('script');
		cryptojs.type = 'text/javascript';
		cryptojs.src = scriptPath + "plugins/cryptojs.js";
		scriptTag.parentNode.insertBefore(cryptojs, scriptTag);
		
		var jsencrypt = doc.createElement('script');
		jsencrypt.type = 'text/javascript';
		jsencrypt.src = scriptPath + "plugins/jsencrypt.js";
		scriptTag.parentNode.insertBefore(jsencrypt, scriptTag);
	}
	importPlugins();
	
	if (typeof Object.assign != "function") {
		Object.assign = function (target) {
			"use strict";
			if (target == null) {
				throw new TypeError("Cannot convert undefined or null to object");
			}
			
			target = Object(target);
			for (var index = 1; index < arguments.length; index++) {
				var source = arguments[index];
				if (source != null) {
					for (var key in source) {
						if (Object.prototype.hasOwnProperty.call(source, key)) {
							target[key] = source[key];
						}
					}
				}
			}
			return target;
		};
	}
	
	// RSA公钥加密
	function rsaPubEncrypt (pas, publicKey) {
		var jse = new JSEncrypt();
		jse.setPublicKey(publicKey);
		return jse.encryptLong(pas);
	}
	
	// RSA公钥解密
	function rsaPubDecrypt (pas, publicKey) {
		var jse = new JSEncrypt();
		jse.setPublicKey(publicKey);
		return jse.pubDecryptLong(pas);
	}
	
	// AES解密
	function aesDecrypt (word, key) {
		key = CryptoJS.enc.Utf8.parse(key);
		var decrypt = CryptoJS.AES.decrypt(word, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
		var decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
		return decryptedStr.toString();
	}
	
	// AES加密
	function aesEncrypt (word, key) {
		key = CryptoJS.enc.Utf8.parse(key);
		var srcs = CryptoJS.enc.Utf8.parse(word);
		var encrypted = CryptoJS.AES.encrypt(srcs, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
		return encrypted.toString();
	}
	
	// MD5加密
	function md5Encrypt32 (word) {
//		return CryptoJS.MD5(word).toString()
		return new MD5().md5(word);
	}
	
	function md5Encrypt16 (word) {
		var md5 = md5Encrypt32(word);
		return md5.substring(8, 24);
	}
	
	var _props = {
		apiAddr: "https://verify.cloudcrowd.com.cn",
		webKey: null,
		verifyWidth: null,
		border: "1px solid rgba(51, 51, 51, 0.25)",
		borderRadius: "4px",
		bgColor: "rgba(255, 255, 255, 0.9)",
		color: "#333333",
		successColor: "#1ca21c",
		failureColor: "#dd1010"
	};
	
	var _data = {
		paramLoaded: false,
		loaded: false,
		hide: true,
		mode: null,
		key: null,
		aesKey: null,
		rsaPubKey: null,
		bgWidth: null,
		bgHeight: null,
		background: [],
		series: [],
		cols: 1,
		guide: null,
		iconY: null,
		times: null,
		loading: false,
		backgroundUp: true,
		verifyResult: null,
		message: null,
		positions: [],
		showVerifying: false,
		isMoving: false,
		x: 0,
		success: null
	};
	
	function GraphicVerify (options) {
		var self = this;
		if (!options || typeof options != "object") {
			options = {};
		}
		
		self = Object.assign(self, _props, options, _data);
		
		self.container = doc.querySelector(self.container);
		self.container.className = "verifyMainBody";
		
		self.verifyParams();
		win.addEventListener("scroll", self.adjustVerifyBox.bind(self)); // IE 8一下不支持bind
		win.addEventListener("resize", self.adjustVerifyBox.bind(self));
//		win.addEventListener("click", self.clickOutside.bind(self));
		win.addEventListener("click", function (event) {
			if(!self.container.contains(event.target)){
				self.hide = true;
				self.changeLoadBtnInfo();
				self.changeVerifyBoxState();
			}
		});
		win.addEventListener("beforeunload", function (event) {
			self.delVerify(self.key);
			self.delVerifyToken(self.verifyResult);
		});
	}
	
	GraphicVerify.prototype = {
		verifyParams: function () {
			this.postFetch("/verify/param", {webKey: this.webKey}, this.verifyParamsCallback);
		},
		initVerify: function (load) {
			if (!this.paramLoaded) return;
			if (!load) {
				if (this.verifyResult) {
					this.hide = true;
				} else {
					this.hide = !this.hide;
				}
				this.changeLoadBtnInfo();
				this.changeVerifyBoxState();
				return;
			}
			this.loading = true;
			this.changeLoadingIconState();
			this.postFetch("/verify/init", {webKey: this.webKey}, this.initVerifyCallback);
		},
		validVerify: function () {
			var encryptPositions = [];
			for (var i = 0; i < this.positions.length; i++) {
				var position = this.positions[i];
				var rsaPosX = rsaPubEncrypt("" + position[0], this.rsaPubKey);
				var rsaPosY = rsaPubEncrypt("" + position[1], this.rsaPubKey);
				var aesPosX = aesEncrypt(rsaPosX, this.aesKey);
				var aesPosY = aesEncrypt(rsaPosY, this.aesKey);
				encryptPositions.push([aesPosX, aesPosY]);
			}
			this.postFetch("/verify/verify", {key: this.key, clientPositions: encryptPositions}, this.validVerifyCallback);
		},
		delVerify: function (key) {
			if (key) {
				this.postFetch("/verify/del", {webKey: this.webKey, key: key});
			}
		},
		delVerifyToken: function (token) {
			if (token) {
				this.postFetch("/verify/delToken", {webKey: this.webKey, token: token});
			}
		},
		verifyParamsCallback: function (response, self) {
			if (!self) self = this;
			if (response.httpCode == 200) {
				self.message = null
				self.bgWidth = response.width;
				self.bgHeight = response.height;
				self.paramLoaded = true;
				
				self.startVerify();
			} else {
				self.message = response.msg;
			}
			self.changeLoadBtnInfo();
		},
		initVerifyCallback: function (response, self) {
			if (!self) self = this;
			if (response.httpCode === 200 && response.success) {
				var currKey = self.key;
				self.loaded = true;
				self.hide = false;
				self.message = null;
				self.series = [];
				self.mode = response.md;
				self.key = response.k;
				self.aesKey = md5Encrypt16(self.key);
				self.rsaPubKey = aesDecrypt(response.rpk, self.aesKey);
				self.background = response.bg;
				var series = response.srs;
				for (var i = 0; i < series.length; i++) {
					self.series.push(parseInt(rsaPubDecrypt(series[i], self.rsaPubKey)));
				}
				self.cols = parseInt(rsaPubDecrypt(response.cls, self.rsaPubKey));
				self.guide = rsaPubDecrypt(response.gd, self.rsaPubKey);
				self.iconY = parseInt(rsaPubDecrypt(response.ih, self.rsaPubKey));
				self.times = response.n;
				self.verifyBox();
				self.adjustVerifyBox();
				self.delVerify(currKey);
			} else {
				self.message = response.msg;
			}
			self.loading = false;
			self.showVerifying = false;
			self.changeLoadBtnInfo();
			self.changeLoadingIconState();
		},
		validVerifyCallback: function (response, self) {
			if (!self) self = this;
			if (response.httpCode === 200) {
				self.verifyResCallback(response.success, response.expired);
				self.verifyResult = response.result;
			} else {
				self.verifyResCallback(null, true);
			}
		},
		verifyResCallback: function (success, expired) {
			var self = this;
			self.success = success;
			self.changeVerifyingIconState();
			setTimeout(function () {
				if (self.success) {
					self.initVerify(false);
				} else {
					if (self.mode == 1) {
						self.getGuideIcon().style.left = "0px";
						self.getDragBar().style.left = "5px";
					}
					if (expired) {
						self.initVerify(true);
					} else {
						self.showVerifying = false;
					}
				}
				self.positions = [];
				if (self.mode == 0) self.clickedIcons();
				self.success = null;
				self.changeVerifyingIconState();
				self.changeLoadingIconState();
			}, 1000);
		},
		postFetch: function (url, data, callback) {
			var self = this;
			try {
				if (!url) url = "";
				if (!data) data = {};
				
				url = self.apiAddr + url;
				data = JSON.stringify(data);
				
				if (win.fetch) {
					var requestConfig = {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Accept": "application/json",
							"pragma": "no-cache",
							"cache-control": "no-cache"
						},
						mode: "cors",
						cache: "no-cache",
						body: data
					};
					
					fetch(url, requestConfig).then(function (response) {
						return response.json();
					}).then(function (resJson) {
						if (callback && typeof callback == "function") callback(resJson, self);
					});
				} else {
					var requestObj;
					if (win.XMLHttpRequest) {
						requestObj = new XMLHttpRequest();
					} else {
						requestObj = new ActiveXObject("Microsoft.XMLHTTP")
					}
					requestObj.open("POST", url, true);
					requestObj.setRequestHeader("Content-type", "application/json");
					
					requestObj.onreadystatechange = function () {
						if (requestObj.readyState == 4) {
							var response;
							if (requestObj.status == 200) {
								response = requestObj.response;
								if (typeof response !== "object") {
									response = JSON.parse(response)
								}
							} else {
								response = {httpCode: -1, msg: "无效的地址"};
							}
							if (callback && typeof callback == "function") callback(response, self);
						}
					}
					requestObj.send(data);
				}
			} catch (error) {
				if (callback && typeof callback == "function") callback({httpCode: -1, msg: "无效的地址"}, self);
			}
		},
		applyStyle: function (target, styleMap) {
			for(var style in styleMap) {
				target.style[style] = styleMap[style];
			}
		},
		successIcon: function () {
			var successIcon = doc.createElement("span");
			successIcon.className = "icon-check-alt";
			return successIcon;
		},
		failureIcon: function () {
			var failureIcon = doc.createElement("span");
			failureIcon.className = "icon-x-check-alt";
			return failureIcon;
		},
		startVerify: function () {
			var self = this;
			var startVerify = doc.createElement("div");
			startVerify.className = "startVerify";
			this.applyStyle(startVerify, this.startVerifyStyle());
			startVerify.addEventListener("mousedown", function () {
				self.initVerify(!self.loaded);
			});
			this.container.appendChild(startVerify);
			
			var loadBtn = doc.createElement("div");
			loadBtn.className = "loadBtn";
			startVerify.appendChild(loadBtn);
			
			var loadBtnInfo = doc.createElement("span");
			loadBtnInfo.className = "loadBtnInfo";
			loadBtnInfo.innerText = "点击打开验证";
			loadBtn.appendChild(loadBtnInfo);
			
			var loadBtnImg = doc.createElement("div");
			loadBtnImg.className = "btnImg logoImg";
			loadBtn.appendChild(loadBtnImg);
		},
		getStartVerify: function () {
			return this.container.querySelector(".startVerify");
		},
		startVerifyStyle: function () {
			var verifyWidth = null;
			if (typeof this.verifyWidth == "string") {
				verifyWidth = this.verifyWidth;
				if (verifyWidth.indexOf("px") > -1) {
					verifyWidth = verifyWidth.substring(0, verifyWidth.indexOf("px"));
				} else if (isNaN(verifyWidth)) {
					verifyWidth = null;
				}
			} else if (typeof this.verifyWidth == "number") {
				verifyWidth = this.verifyWidth;
			}
			var color = this.color;
			if (this.verifyResult) {
				color = this.successColor;
			} else if (this.message) {
				color = this.failureColor;
			}
			return {
				"width": (verifyWidth ? verifyWidth : this.bgWidth) + "px",
				"border": this.border,
				"border-radius": this.borderRadius,
				"background-color": this.bgColor,
				"color": color
			};
		},
		changeLoadBtnInfo: function () {
			var startVerify = this.getStartVerify();
			var loadBtnInfo = startVerify.querySelector(".loadBtn .loadBtnInfo");
			if (this.verifyResult) {
				loadBtnInfo.className = "loadBtnInfo successInfo";
				loadBtnInfo.innerText = "验证成功";
			} else if (this.message) {
				loadBtnInfo.className = "loadBtnInfo errorInfo";
				loadBtnInfo.innerText = this.message;
			} else if (this.hide) {
				loadBtnInfo.className = "loadBtnInfo";
				loadBtnInfo.innerText = "点击打开验证";
			} else {
				loadBtnInfo.className = "loadBtnInfo";
				loadBtnInfo.innerText = "点击关闭验证";
			}
			this.applyStyle(startVerify, this.startVerifyStyle());
		},
		changeLoadingIconState: function () {
			var btnImg = this.container.querySelector(".startVerify .loadBtn .btnImg");
			var successIcon = btnImg.querySelector(".icon-check-alt");
			if (successIcon) successIcon.remove();
			if (this.loading) {
				btnImg.className = "btnImg loading";
			} else if (this.verifyResult) {
				btnImg.className = "btnImg success";
				btnImg.appendChild(this.successIcon());
			} else {
				btnImg.className = "btnImg logoImg";
			}
		},
		verifyBox: function () {
			var verifyBox = this.initVerifyBox();
			
			if (this.mode == 0) {
				var clickVerify = this.clickVerify();
				this.removeOldVerifyBox();
				verifyBox.appendChild(clickVerify);
			} else if (this.mode == 1) {
				var dragVerify = this.dragVerify();
				this.removeOldVerifyBox();
				verifyBox.appendChild(dragVerify);
			}
		},
		initVerifyBox: function () {
			var verifyBox = this.getVerifyBox();
			if (!verifyBox) {
				verifyBox = doc.createElement("div");
				this.container.appendChild(verifyBox);
			}
			verifyBox.className = "verifyBox";
			return verifyBox;
		},
		getVerifyBox: function () {
			return this.container.querySelector(".verifyBox");
		},
		removeOldVerifyBox: function () {
			var oldClickVerify = this.container.querySelector(".verifyBox .clickVerify");
			if (oldClickVerify) {
				oldClickVerify.remove();
			}
			var oldDragVerify = this.container.querySelector(".verifyBox .dragVerify");
			if (oldDragVerify) {
				oldDragVerify.remove();
			}
		},
		adjustVerifyBox: function () {
			var startVerify = this.getStartVerify();
			var verifyBox = this.getVerifyBox();
			if (!startVerify || !verifyBox) return;
			
			var verifyBoxStyle = {};
			var mainToTop = this.container.getBoundingClientRect().top;
			var mainRightToLeft = this.container.getBoundingClientRect().right;
			var mainToRight = doc.body.clientWidth - mainRightToLeft;
			var mainToLeft = this.container.getBoundingClientRect().left;

			var verifyBoxLeft = (mainRightToLeft - mainToLeft) / 2 - this.bgWidth / 2;
			if (mainToLeft + verifyBoxLeft < 0) {
				verifyBoxStyle = {left: (0 - mainToLeft) + "px", right: "auto"};
			} else if (mainToRight + verifyBoxLeft < 0) {
				verifyBoxStyle = {left: "auto", right: (0 - mainToRight) + "px"};
			} else {
				verifyBoxStyle = {left: verifyBoxLeft + "px", right: "auto"};
			}

			var startVerifyHeight = startVerify.offsetHeight + 10;
			if (mainToTop >= this.bgHeight + 40) {
				verifyBoxStyle.top = "auto";
				verifyBoxStyle.bottom = startVerifyHeight + "px";
				this.backgroundUp = true;
			} else {
				verifyBoxStyle.top = startVerifyHeight + "px";
				verifyBoxStyle.bottom = "auto";
				this.backgroundUp = false;
			}
			this.applyStyle(verifyBox, verifyBoxStyle);
			this.adjustGuideBar();
		},
		adjustGuideBar: function () {
			var tempDiv = doc.createElement("div");
			if (this.backgroundUp) {
				var verifyGuideBar = this.getVerifyGuideBar();
				if (!verifyGuideBar) return;
				var parentNode = verifyGuideBar.parentNode;
				parentNode.appendChild(tempDiv);
				parentNode.replaceChild(verifyGuideBar, tempDiv);
			} else {
				var backgroundImg = this.getBackgroundImg();
				if (!backgroundImg) return;
				var parentNode = backgroundImg.parentNode;
				parentNode.appendChild(tempDiv);
				parentNode.replaceChild(backgroundImg, tempDiv);
			}
		},
		changeVerifyBoxState: function () {
			var verifyBox = this.container.querySelector(".verifyBox");
			if (verifyBox) {
				if (this.hide) {
					verifyBox.className = "verifyBox hide";
				} else {
					verifyBox.className = "verifyBox";
				}
			}
		},
		clickVerify: function () {
			var clickVerify = doc.createElement("div");
			clickVerify.className = "clickVerify";
			this.applyStyle(clickVerify, {"width": this.bgWidth + "px"});
			
			var clickGuideBar = this.clickGuideBar();
			if (!this.backgroundUp) {
				clickVerify.appendChild(clickGuideBar);
			}
			
			var backgroundImg = doc.createElement("div");
			backgroundImg.className = "backgroundImg";
			clickVerify.appendChild(backgroundImg);
			
			var imageBox = this.imageBox();
			this.clickBgEvent(imageBox);
			backgroundImg.appendChild(imageBox);
			
			var verifyingIcon = this.verifyingIcon();
			backgroundImg.appendChild(verifyingIcon);
			
			if (this.backgroundUp) {
				clickVerify.appendChild(clickGuideBar);
			}
			
			return clickVerify;
		},
		dragVerify: function () {
			var dragVerify = doc.createElement("div");
			dragVerify.className = "dragVerify";
			this.applyStyle(dragVerify, {"width": this.bgWidth + "px"});
			
			var dragGuideBar = this.dragGuideBar();
			if (!this.backgroundUp) {
				dragVerify.appendChild(dragGuideBar);
			}
			
			var backgroundImg = doc.createElement("div");
			backgroundImg.className = "backgroundImg";
			this.movingDragEvent(backgroundImg);
			this.finishDragEvent(backgroundImg);
			dragVerify.appendChild(backgroundImg);
			
			var imageBox = this.imageBox();
			backgroundImg.appendChild(imageBox);
			
			var guideIcon = doc.createElement("div");
			guideIcon.className = "guideIcon";
			this.applyStyle(guideIcon, {"top": this.iconY + "px", "left": "0px"});
			this.dragStartEvent(guideIcon);
			backgroundImg.appendChild(guideIcon);
			
			var shelter = doc.createElement("div");
			shelter.className = "shelter";
			guideIcon.appendChild(shelter);
			
			var guideImg = doc.createElement("img");
			guideImg.src = "data:image/png;base64," + this.guide;
			guideIcon.appendChild(guideImg);
			
			var verifyingIcon = this.verifyingIcon();
			backgroundImg.appendChild(verifyingIcon);
			
			if (this.backgroundUp) {
				dragVerify.appendChild(dragGuideBar);
			}
			
			return dragVerify;
		},
		getBackgroundImg: function () {
			return this.container.querySelector(".verifyBox .backgroundImg");
		},
		imageBox: function () {
			var imageBox = doc.createElement("div");
			imageBox.className = "imageBox";
			
			for (var i = 0; i < this.series.length / this.cols; i++) {
				var imageIcon = doc.createElement("div");
				imageIcon.className = "imageIcon";
				imageBox.appendChild(imageIcon);
				
				for (var j = 0; j < this.cols; j++) {
					var imagePiece = doc.createElement("img");
					imagePiece.src = "data:image/png;base64," + this.background[this.series[this.cols * i + j]];
					imageIcon.appendChild(imagePiece);
				}
			}
			
			return imageBox;
		},
		getGuideIcon: function () {
			return this.container.querySelector(".dragVerify .backgroundImg .guideIcon");
		},
		verifyingIcon: function () {
			var verifyingIcon = doc.createElement("div");
			verifyingIcon.className = "verifyingIcon hide";
			
			var loadingIcon = doc.createElement("div");
			loadingIcon.className = "verifyRes loading";
			verifyingIcon.appendChild(loadingIcon);
			
			return verifyingIcon;
		},
		getVerifyingIcon: function () {
			return this.container.querySelector(".verifyBox .backgroundImg .verifyingIcon");
		},
		changeVerifyingIconState: function () {
			var verifyingIcon = this.getVerifyingIcon();
			var verifyRes = verifyingIcon.querySelector(".verifyRes");
			var successIcon = verifyRes.querySelector(".icon-check-alt");
			if (successIcon) successIcon.remove();
			var failureIcon = verifyRes.querySelector(".icon-x-check-alt");
			if (failureIcon) failureIcon.remove();
			
			var verifyResStyle = {};
			if (this.success == true) {
				verifyRes.className = "verifyRes success";
				verifyRes.appendChild(this.successIcon());
				verifyResStyle.color = this.successColor;
			} else if (this.success == false) {
				verifyRes.className = "verifyRes failure";
				verifyRes.appendChild(this.failureIcon());
				verifyResStyle.color = this.failureColor;
			} else {
				verifyRes.className = "verifyRes loading";
				verifyResStyle.color = "inherit";
			}
			this.applyStyle(verifyRes, verifyResStyle);
			if (this.showVerifying) {
				verifyingIcon.className = "verifyingIcon";
			} else {
				verifyingIcon.className = "verifyingIcon hide";
			}
		},
		clickedIcons: function () {
			var backgroundImg = this.getBackgroundImg();
			var clickedIcons = backgroundImg.querySelectorAll(".clickedIcon");
			
			if (this.positions == null || this.positions.length == 0) {
				if (clickedIcons) {
					for (var i = 0; i < clickedIcons.length; i++) {
						clickedIcons[i].remove();
					}
				}
			} else {
				for (var i = (clickedIcons ? clickedIcons.length : 0); i < this.positions.length; i++) {
					var pos = this.positions[i];
					var clickedIcon = doc.createElement("div");
					clickedIcon.className = "clickedIcon";
					clickedIcon.innerText = (i + 1);
					this.applyStyle(clickedIcon, {"left": (pos[0] - 12) + "px", "top": (pos[1] - 12) + "px"});
					backgroundImg.appendChild(clickedIcon);
				}
			}
		},
		clickGuideBar: function () {
			var clickGuideBar = doc.createElement("div");
			clickGuideBar.className = "verifyGuideBar";
			
			var guideInfo = doc.createElement("span");
			guideInfo.className = "guideInfo";
			guideInfo.innerText = this.guide;
			clickGuideBar.appendChild(guideInfo);
			
			var freshBtn = this.freshBtn();
			clickGuideBar.appendChild(freshBtn);
			
			return clickGuideBar;
		},
		dragGuideBar: function () {
			var dragGuideBar = doc.createElement("div");
			dragGuideBar.className = "verifyGuideBar";
			this.movingDragEvent(dragGuideBar);
			this.finishDragEvent(dragGuideBar);
			
			var dragBar = doc.createElement("span");
			dragBar.className = "dragBar";
			this.applyStyle(dragBar, {"left": "5px"});
			this.dragStartEvent(dragBar);
			dragGuideBar.appendChild(dragBar);
			
			var progressBar = doc.createElement("span");
			progressBar.className = "progressBar";
			dragGuideBar.appendChild(progressBar);
			
			var freshBtn = this.freshBtn();
			dragGuideBar.appendChild(freshBtn);
			
			return dragGuideBar;
		},
		getVerifyGuideBar: function () {
			return this.container.querySelector(".verifyBox .verifyGuideBar");
		},
		getDragBar: function () {
			return this.container.querySelector(".dragVerify .verifyGuideBar .dragBar");
		},
		freshBtn: function () {
			var self = this;
			var freshBtn = doc.createElement("div");
			freshBtn.className = "freshBtn";
			freshBtn.title = "刷新";
			freshBtn.addEventListener("mousedown", function () {
				self.showVerifying = true;
				self.changeVerifyingIconState();
				self.initVerify(true);
			});
			return freshBtn;
		},
		clickOutside: function (event) {
			var self = this;
			if(!self.container.contains(event.target)){
				self.hide = true;
				self.changeLoadBtnInfo();
				self.changeVerifyBoxState();
			}
		},
		clickBgEvent: function (target) {
			var self = this;
			target.addEventListener("click", function (event) {
				if (self.positions.length >= self.times) return;
				var e = event || win.event;
				var mLeft = e.clientX;
				var mTop = e.clientY;
				var backgroundImg = self.getBackgroundImg();
				var imgLeft = backgroundImg.getBoundingClientRect().left;
				var imgTop = backgroundImg.getBoundingClientRect().top;
				if (self.positions.length < self.times) {
					self.positions.push([mLeft - imgLeft, mTop - imgTop]);
					self.clickedIcons();
				}
				if (self.positions.length === self.times) {
					self.showVerifying = true;
					self.changeVerifyingIconState();
					self.validVerify();
				}
			});
		},
		dragStartEvent: function (target) {
			var self = this;
			target.addEventListener("mousedown", function (event) {
				if (!self.showVerifying && !self.success) {
					self.isMoving = true
					var guideIcon = self.getGuideIcon();
					self.x = (event.pageX || event.touches[0].pageX) - parseInt(guideIcon.style.left.replace("px", ""), 10)
				}
			});
		},
		movingDragEvent: function (target) {
			var self = this;
			target.addEventListener("mousemove", function (event) {
				if (self.isMoving && !self.success) {
					var guideIcon = self.getGuideIcon();
					var height = guideIcon.offsetHeight;
					var _x = (event.pageX || event.touches[0].pageX) - self.x;
					var guideIcon = self.getGuideIcon();
					var dragBar = self.getDragBar();
					if (_x >= 0 && _x <= (self.bgWidth - height)) {
						guideIcon.style.left = _x + "px";
						dragBar.style.left = (_x + 5) + "px";
					} else if (_x > (self.bgWidth - height)) {
						guideIcon.style.left = (self.bgWidth - height)+ "px";
						dragBar.style.left = (self.bgWidth - height + 5) + "px";
					}
				}
			})
		},
		finishDragEvent: function (target) {
			var self = this;
			target.addEventListener("mouseup", function (event) {
				if (self.isMoving && !self.success) {
					var _x = (event.pageX || event.changedTouches[0].pageX) - self.x;
					if (self.positions.length < self.times) self.positions.push([_x, self.iconY]);
					if (self.positions.length === self.times) {
						self.showVerifying = true;
						self.changeVerifyingIconState();
						self.isMoving = false;
						self.validVerify();
					}
				}
			})
		},
		reset: function () {
			var token = this.verifyResult;
			this.loaded = false;
			this.verifyResult = null;
			this.changeLoadBtnInfo();
			this.changeLoadingIconState();
			this.delVerifyToken(token);
		}
	}
	
	function MD5 () {
		
	}
	
	MD5.prototype = {
		safe_add: function (x, y) {
			var lsw = (x & 0xFFFF) + (y & 0xFFFF),
				msw = (x >> 16) + (y >> 16) + (lsw >> 16);
			return (msw << 16) | (lsw & 0xFFFF);
		},
		bit_rol: function (num, cnt) {
			return (num << cnt) | (num >>> (32 - cnt));
		},
		md5_cmn: function (q, a, b, x, s, t) {
			return this.safe_add(this.bit_rol(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s), b);
		},
		md5_ff: function (a, b, c, d, x, s, t) {
			return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
		},
		md5_gg: function (a, b, c, d, x, s, t) {
			return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
		},
		md5_hh: function (a, b, c, d, x, s, t) {
			return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
		},
		md5_ii: function (a, b, c, d, x, s, t) {
			return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
		},
		binl_md5: function (x, len) {
			x[len >> 5] |= 0x80 << (len % 32);
			x[(((len + 64) >>> 9) << 4) + 14] = len;
			
			var i, olda, oldb, oldc, oldd,
				a =  1732584193,
				b = -271733879,
				c = -1732584194,
				d =  271733878;
			
			for (i = 0; i < x.length; i += 16) {
				olda = a;
				oldb = b;
				oldc = c;
				oldd = d;
				
				a = this.md5_ff(a, b, c, d, x[i],	   7, -680876936);
				d = this.md5_ff(d, a, b, c, x[i +  1], 12, -389564586);
				c = this.md5_ff(c, d, a, b, x[i +  2], 17,  606105819);
				b = this.md5_ff(b, c, d, a, x[i +  3], 22, -1044525330);
				a = this.md5_ff(a, b, c, d, x[i +  4],  7, -176418897);
				d = this.md5_ff(d, a, b, c, x[i +  5], 12,  1200080426);
				c = this.md5_ff(c, d, a, b, x[i +  6], 17, -1473231341);
				b = this.md5_ff(b, c, d, a, x[i +  7], 22, -45705983);
				a = this.md5_ff(a, b, c, d, x[i +  8],  7,  1770035416);
				d = this.md5_ff(d, a, b, c, x[i +  9], 12, -1958414417);
				c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
				b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
				a = this.md5_ff(a, b, c, d, x[i + 12],  7,  1804603682);
				d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
				c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
				b = this.md5_ff(b, c, d, a, x[i + 15], 22,  1236535329);
				
				a = this.md5_gg(a, b, c, d, x[i +  1],  5, -165796510);
				d = this.md5_gg(d, a, b, c, x[i +  6],  9, -1069501632);
				c = this.md5_gg(c, d, a, b, x[i + 11], 14,  643717713);
				b = this.md5_gg(b, c, d, a, x[i],	  20, -373897302);
				a = this.md5_gg(a, b, c, d, x[i +  5],  5, -701558691);
				d = this.md5_gg(d, a, b, c, x[i + 10],  9,  38016083);
				c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
				b = this.md5_gg(b, c, d, a, x[i +  4], 20, -405537848);
				a = this.md5_gg(a, b, c, d, x[i +  9],  5,  568446438);
				d = this.md5_gg(d, a, b, c, x[i + 14],  9, -1019803690);
				c = this.md5_gg(c, d, a, b, x[i +  3], 14, -187363961);
				b = this.md5_gg(b, c, d, a, x[i +  8], 20,  1163531501);
				a = this.md5_gg(a, b, c, d, x[i + 13],  5, -1444681467);
				d = this.md5_gg(d, a, b, c, x[i +  2],  9, -51403784);
				c = this.md5_gg(c, d, a, b, x[i +  7], 14,  1735328473);
				b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
				
				a = this.md5_hh(a, b, c, d, x[i +  5],  4, -378558);
				d = this.md5_hh(d, a, b, c, x[i +  8], 11, -2022574463);
				c = this.md5_hh(c, d, a, b, x[i + 11], 16,  1839030562);
				b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
				a = this.md5_hh(a, b, c, d, x[i +  1],  4, -1530992060);
				d = this.md5_hh(d, a, b, c, x[i +  4], 11,  1272893353);
				c = this.md5_hh(c, d, a, b, x[i +  7], 16, -155497632);
				b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
				a = this.md5_hh(a, b, c, d, x[i + 13],  4,  681279174);
				d = this.md5_hh(d, a, b, c, x[i],	  11, -358537222);
				c = this.md5_hh(c, d, a, b, x[i +  3], 16, -722521979);
				b = this.md5_hh(b, c, d, a, x[i +  6], 23,  76029189);
				a = this.md5_hh(a, b, c, d, x[i +  9],  4, -640364487);
				d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
				c = this.md5_hh(c, d, a, b, x[i + 15], 16,  530742520);
				b = this.md5_hh(b, c, d, a, x[i +  2], 23, -995338651);
				
				a = this.md5_ii(a, b, c, d, x[i],	   6, -198630844);
				d = this.md5_ii(d, a, b, c, x[i +  7], 10,  1126891415);
				c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
				b = this.md5_ii(b, c, d, a, x[i +  5], 21, -57434055);
				a = this.md5_ii(a, b, c, d, x[i + 12],  6,  1700485571);
				d = this.md5_ii(d, a, b, c, x[i +  3], 10, -1894986606);
				c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
				b = this.md5_ii(b, c, d, a, x[i +  1], 21, -2054922799);
				a = this.md5_ii(a, b, c, d, x[i +  8],  6,  1873313359);
				d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
				c = this.md5_ii(c, d, a, b, x[i +  6], 15, -1560198380);
				b = this.md5_ii(b, c, d, a, x[i + 13], 21,  1309151649);
				a = this.md5_ii(a, b, c, d, x[i +  4],  6, -145523070);
				d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
				c = this.md5_ii(c, d, a, b, x[i +  2], 15,  718787259);
				b = this.md5_ii(b, c, d, a, x[i +  9], 21, -343485551);
				
				a = this.safe_add(a, olda);
				b = this.safe_add(b, oldb);
				c = this.safe_add(c, oldc);
				d = this.safe_add(d, oldd);
			}
			return [a, b, c, d];
		},
		binl2rstr: function (input) {
			var i,
				output = '';
			for (i = 0; i < input.length * 32; i += 8) {
				output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
			}
			return output;
		},
		rstr2binl: function (input) {
			var i,
				output = [];
			output[(input.length >> 2) - 1] = undefined;
			for (i = 0; i < output.length; i += 1) {
				output[i] = 0;
			}
			for (i = 0; i < input.length * 8; i += 8) {
				output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
			}
			return output;
		},
		rstr_md5: function (s) {
			return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
		},
		rstr_hmac_md5: function (key, data) {
			var i,
				bkey = this.rstr2binl(key),
				ipad = [],
				opad = [],
				hash;
			ipad[15] = opad[15] = undefined;
			if (bkey.length > 16) {
				bkey = this.binl_md5(bkey, key.length * 8);
			}
			for (i = 0; i < 16; i += 1) {
				ipad[i] = bkey[i] ^ 0x36363636;
				opad[i] = bkey[i] ^ 0x5C5C5C5C;
			}
			hash = this.binl_md5(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
			return this.binl2rstr(this.binl_md5(opad.concat(hash), 512 + 128));
		},
		rstr2hex: function (input) {
			var hex_tab = '0123456789abcdef',
				output = '',
				x,
				i;
			for (i = 0; i < input.length; i += 1) {
				x = input.charCodeAt(i);
				output += hex_tab.charAt((x >>> 4) & 0x0F) +
					hex_tab.charAt(x & 0x0F);
			}
			return output;
		},
		str2rstr_utf8: function (input) {
			return unescape(encodeURIComponent(input));
		},
		raw_md5: function (s) {
			return this.rstr_md5(this.str2rstr_utf8(s));
		},
		hex_md5: function (s) {
			return this.rstr2hex(this.raw_md5(s));
		},
		raw_hmac_md5: function (k, d) {
			return this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d));
		},
		hex_hmac_md5: function (k, d) {
			return this.rstr2hex(this.raw_hmac_md5(k, d));
		},
		md5: function (string, key, raw) {
			if (!key) {
				if (!raw) {
					return this.hex_md5(string);
				}
				return this.raw_md5(string);
			}
			if (!raw) {
				return this.hex_hmac_md5(key, string);
			}
			return this.raw_hmac_md5(key, string);
		}
	}
	
	win.GraphicVerify = GraphicVerify;

})(window, document);
