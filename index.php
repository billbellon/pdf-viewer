<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<?php
	include( __DIR__ . '/include/php/pdf-viewer.php' );
	$pdfViewer = new PDFViewer();
	?>
	<title>PDF</title>
	<link href="./include/css/index.css" rel="stylesheet" type="text/css">
</head>
<body>
<script>
	// If absolute URL from the remote server is provided, configure the CORS
	// header on that server.
	let pdfURL = 'https://cms-test1.ssec.wisc.edu/pdf-viewer/include/example2.pdf';
</script>
<script src="./include/js/pdfjs-2.0.943-dist/build/pdf.js"></script>
<script src="./include/js/pdf-viewer.js"></script>

<div id="banner">
	<h1 id="title">PDF</h1>
	<div id="controls">
		<span class="control-group">
			<button>Download PDF</button>
		</span>
		<span id="zoom-buttons" class="control-group">
			<button id="zoomout">-</button>
			<button id="zoomin">+</button>
		</span>
		<span id="prevnext-buttons" class="control-group">
			<button id="prev">&laquo; Previous</button>
			<button id="next">Next &raquo;</button>
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