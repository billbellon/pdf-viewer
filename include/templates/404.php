<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>404 -- Not Found</title>
	<link href="./include/css/index.css" rel="stylesheet" type="text/css">
</head>
<body>

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
	<div id="error-message">
		<h1>404 - Not Found</h1>
		<p>The PDF you have requested was not found.</p>
	</div>
</div>
</body>
</html>