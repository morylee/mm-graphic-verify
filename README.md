# mm-graphic-verify

> A JS graphic verify project, that need to be used with another authentication service, you can visit [website of graphic verify service](https://verify.cloudcrowd.com.cn) to apply for an account.

## Installation

Download this package, copy it into you project.

## Usage

You need import `./verify.css` and `./verify.js` into you html file, just as below.

``` bash
<html>
	<head>
		<link rel="stylesheet" type="text/css" href="yourPath/verify.css">
	</head>
	
	<body>
		<div id="gVerify"></div>
		
		<script type="text/javascript" src="yourPath/verify.js"></script>
		<script type="text/javascript">
			var gv = new GraphicVerify({
				webKey: "643b1dd9ddb2477d9963f036a988ed7d",
				container: "#gVerify"
			});
		</script>
	</body>
</html>
```

When verifying success, you can get the successful token of `GraphicVerify` from the `GraphicVerify` object, like below.

``` bash
<html>
	<head>
		<link rel="stylesheet" type="text/css" href="yourPath/verify.css">
	</head>
	
	<body>
		<div id="gVerify"></div>
		<button onclick="checkToken">验证token</button>
		
		<script type="text/javascript" src="yourPath/verify.js"></script>
		<script type="text/javascript">
			var gv = new GraphicVerify({
				webKey: "643b1dd9ddb2477d9963f036a988ed7d",
				container: "#gVerify"
			});
			
			function checkToken () {
				var token = gv.verifyResult;
				
				# do check token...
			}
		</script>
	</body>
</html>
```

At the same time, you can define your own callback function, then, you can do what you want to do.

``` bash
<html>
	<head>
		<link rel="stylesheet" type="text/css" href="yourPath/verify.css">
	</head>
	
	<body>
		<div id="gVerify"></div>
		<button id="checkTokenBtn" onclick="checkToken" disabled>验证token</button>
		
		<script type="text/javascript" src="yourPath/verify.js"></script>
		<script type="text/javascript">
			var gv = new GraphicVerify({
				webKey: "643b1dd9ddb2477d9963f036a988ed7d",
				container: "#gVerify",
				successCallback: enableCheckButton
			});
			
			function enableCheckButton () {
				document.getElementById("checkTokenBtn").disabled = "";
			}
			
			function checkToken () {
				var token = gv.verifyResult;
				
				# do check token...
			}
		</script>
	</body>
</html>
```

Also, you may want to reset the `GraphicVerify`, and we provide a method to do that.

``` bash
<html>
	<head>
		<link rel="stylesheet" type="text/css" href="yourPath/verify.css">
	</head>
	
	<body>
		<div id="gVerify"></div>
		<button onclick="reset">重置</button>
		
		<script type="text/javascript" src="yourPath/verify.js"></script>
		<script type="text/javascript">
			var gv = new GraphicVerify({
				webKey: "643b1dd9ddb2477d9963f036a988ed7d",
				container: "#gVerify"
			});
			
			function reset () {
				gv.reset();
			}
		</script>
	</body>
</html>
```

## Props

| Property | Type | Default | Description |
| :------: | ---- | ------- | ----------- |
| apiAddr | String | https://verify.cloudcrowd.com.cn | api address |
| webKey | String | - | website key |
| verifyWidth | String, Number | image's width | `GraphicVerify` button's width |
| border | String | 1px solid rgba(51, 51, 51, 0.25) | `GraphicVerify` button's border |
| borderRadius | String | 4px | `GraphicVerify` button's border radius |
| bgColor | String | rgba(255, 255, 255, 0.9) | `GraphicVerify` button's background color |
| color | String | #333333 | `GraphicVerify` button's default color |
| successColor | String | #1ca21c | `GraphicVerify` success color |
| failureColor | String | #dd1010 | `GraphicVerify` failure color |
| successCallback | fn | null | `GraphicVerify` verify success callback |

## Methods

| Name | In Param Type | Description |
| :------: | ---- | ----------- |
| reset() | - | reset the `GraphicVerify` |
