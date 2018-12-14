<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>PDF</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
	<link href="./include/css/index.css" rel="stylesheet" type="text/css">
	<script>
		// If absolute URL from the remote server is provided, configure the CORS
		// header on that server.
		let pdfURL = '<?php echo $this->url;?>';
	</script>
	<script src="./include/js/pdfjs-2.0.943-dist/build/pdf.js"></script>
	<script src="./include/js/pdf-viewer.js"></script>
</head>
<body>
<div id="banner">
	<h1 id="title">PDF</h1>
	<div id="controls">
		<span class="control-group" id="download-button">
			<a href="<?php echo $this->url;?>"><button class="btn btn-light">Download PDF</button></a>
		</span>
		<span id="zoom-buttons" class="control-group">
			<button class="btn btn-light" id="zoomout">-</button>
			<button class="btn btn-light" id="zoomin">+</button>
		</span>
		<span id="prevnext-buttons" class="control-group">
			<button class="btn btn-light" id="prev">&laquo; Previous</button>
			<button class="btn btn-light" id="next">Next &raquo;</button>
		</span>
		<span id="page-num-container" class="control-group">
			Page: <span id="page_num"></span> / <span id="page_count"></span>
		</span>
	</div>
</div>
<div id="pdf-container">
	<canvas id="the-canvas"></canvas>
	<canvas id="the-canvas-2"></canvas>
</div>
</body>
</html>