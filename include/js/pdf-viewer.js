document.addEventListener("DOMContentLoaded", function(event) {

	// Loaded via <script> tag, create shortcut to access PDF.js exports.
	// var pdfjsLib = window['pdfjs-dist/build/pdf']; // DEBUG - what is this used for and does this need to be updated with my path to pdf.js?

	// The workerSrc property shall be specified.
	pdfjsLib.GlobalWorkerOptions.workerSrc = './include/js/pdfjs-2.0.943-dist/build/pdf.worker.js';

	let PDF = {
		pdfDoc: {left: null, right: null},
		pageNum: {left: 1, right: 2},
		pageRendering: {left: false, right: false},
		pageNumPending: {left: null, right: null},
		canvas: {left: document.getElementById('the-canvas'), right: document.getElementById('the-canvas-2')},
		zoom: 1,
		zoomFactor: 0.2
	};
	PDF.ctx = {
		left: PDF.canvas.left.getContext('2d'),
		right: PDF.canvas.right.getContext('2d')
	};
	let resizeTimer;

	init(pdfURL);

	//============================================================================
	// FUNCTIONS
	//============================================================================

	/**
	 * Asynchronously downloads PDF.
	 */
	function init(pdfURL) {
		document.getElementById('next').addEventListener('click', onNextPage);
		document.getElementById('prev').addEventListener('click', onPrevPage);

		document.getElementById('zoomout').addEventListener('click', onZoomOut);
		document.getElementById('zoomin').addEventListener('click', onZoomIn);

		pdfjsLib.getDocument(pdfURL).then(function(pdfDoc_) {
			PDF.pdfDoc.left = pdfDoc_;
			PDF.pdfDoc.right = pdfDoc_;

			setTitle(pdfDoc_);

			document.getElementById('page_count').textContent = PDF.pdfDoc.left.numPages;

			// resize left and right page on resize event (specifically when resizing is done).
			// based on: https://css-tricks.com/snippets/jquery/done-resizing-event/
			window.addEventListener('resize', function() {
				window.clearTimeout(resizeTimer);
				resizeTimer = window.setTimeout(function() {
					renderView(PDF.pageNum.left, 'left');
					renderView(PDF.pageNum.right, 'right');
				}, 250);

			});

			// Initial/first page rendering
			renderView(PDF.pageNum.left, 'left');
			renderView(PDF.pageNum.right, 'right');
		});
	}

	/**
	 * Get page info from document, resize canvas accordingly, and render page.
	 * @param page_num  - Page number.
	 * @param side - which page / canvas to render.
	 */
	function renderView(page_num, side) {

		if (page_num === 'show-blank-page') {
			PDF.canvas[side].style.display = 'none';
			return;
		} else {
			PDF.canvas[side].style.display = 'inline-block';
		}


		PDF.pageRendering[side] = true;

		// Using promise to fetch the page
		PDF.pdfDoc[side].getPage(page_num).then(function(page) {
			let borderThickness = 1;
			let desiredWidth = (windowWidth() / 2) - borderThickness;
			let desiredHeight = windowHeight() - document.getElementById('banner').offsetHeight;
			desiredWidth = desiredWidth * PDF.zoom;
			desiredHeight = desiredHeight * PDF.zoom;

			let viewport = page.getViewport(1);
			let scale1 = desiredWidth / viewport.width;
			let scale2 = desiredHeight / viewport.height;
			let scaledViewport;

			if (scale1 >= scale2) {
				scaledViewport = page.getViewport(scale2);
			} else {
				scaledViewport = page.getViewport(scale1);
			}

			PDF.canvas[side].height = desiredHeight;
			PDF.canvas[side].width = desiredWidth;

			// align left page to the right by setting the horizontal factor in the canvas transformation matrix
			let h = 0;
			if (side === 'left') {
				let diff = PDF.canvas.left.width - scaledViewport.width;
				if (diff > 0) {
					h = diff;
				}
			}

			// Render PDF page into canvas context
			let renderContext = {
				canvasContext: PDF.ctx[side],
				viewport: scaledViewport,
				transform: [1, 0, 0, 1, h, 0]
			};
			let renderTask = page.render(renderContext);

			// Wait for rendering to finish
			renderTask.promise.then(function() {
				PDF.pageRendering[side] = false;
				if (PDF.pageNumPending[side] !== null) {
					// New page rendering is pending
					renderView(PDF.pageNumPending[side], page);
					PDF.pageNumPending[side] = null;
				}
			});
		});

		// Update page counters
		document.getElementById('page_num').textContent = page_num;
	}

	/**
	 * Get viewport width
	 */
	function windowWidth() {
		return window.innerWidth;
	}

	/**
	 * Get viewport height
	 */
	function windowHeight() {
		return window.innerHeight;
	}

	/**
	 * If another page rendering in progress, waits until the rendering is
	 * finised. Otherwise, executes rendering immediately.
	 *
	 * @param side
	 * @param page_num
	 */
	function queueRenderPage(side, page_num) {
		if (PDF.pageRendering[side]) {
			PDF.pageNumPending[side] = page_num;
		} else {
			renderView(page_num, side);
		}
	}

	/**
	 * Displays previous page.
	 */
	function onPrevPage() {
		// THIS IS A SIMPLE FIX FOR THE PROBLEM OF THE USER CLICKING ON
		// THE PREV/NEXT BUTTON REALLY FAST WHICH RESULTS IN BOTH CANVASES SHOWING
		// THE SAME PAGE.  IMPROVE - COME UP WITH A BETTER SOLUTION
		if (PDF.pageRendering.left || PDF.pageRendering.right) {
			return;
		}

		if (PDF.pageNum.left <= 1) {
			return;
		}

		if (coverPage('previous')) {
			PDF.pageNum.left = PDF.pageNum.left - 1;
			PDF.pageNum.right = PDF.pageNum.right - 1;
		} else {
			PDF.pageNum.left = PDF.pageNum.left - 2;
			PDF.pageNum.right = PDF.pageNum.right - 2;
		}

		queueRenderPage('left', PDF.pageNum.left);
		queueRenderPage('right', PDF.pageNum.right);
	}

	/**
	 * Displays next page.
	 */
	function onNextPage() {
		// THIS IS A SIMPLE FIX FOR THE PROBLEM OF THE USER CLICKING ON
		// THE PREV/NEXT BUTTON REALLY FAST WHICH RESULTS IN BOTH CANVASES SHOWING
		// THE SAME PAGE.  IMPROVE - COME UP WITH A BETTER SOLUTION
		if (PDF.pageRendering.left || PDF.pageRendering.right) {
			return;
		}

		if (PDF.pageNum.left >= PDF.pdfDoc.left.numPages - 1) {
			return;
		}

		if (coverPage('next')) {
			PDF.pageNum.left = PDF.pageNum.left + 1;
			PDF.pageNum.right = PDF.pageNum.right + 1;
		} else {
			PDF.pageNum.left = PDF.pageNum.left + 2;
			PDF.pageNum.right = PDF.pageNum.right + 2;
		}

		queueRenderPage('left', PDF.pageNum.left);
		if (PDF.pageNum.right <= PDF.pdfDoc.right.numPages) {
			queueRenderPage('right', PDF.pageNum.right);
		} else {
			queueRenderPage('right', 'show-blank-page');
		}
	}

	function coverPage(direction) {
		if (direction === 'next') {
			return (PDF.pageNum.left === 1);
		} else {
			return (PDF.pageNum.left === 2);
		}
	}

	/**
	 * zoom out / decrease page magification
	 */
	function onZoomOut() {
		PDF.zoom = PDF.zoom * (1 - PDF.zoomFactor);
		if (PDF.zoom < 1) PDF.zoom = 1;
		renderView(PDF.pageNum.left, 'left');
		renderView(PDF.pageNum.right, 'right');
	}

	/**
	 * zoom in / increase page magification
	 */
	function onZoomIn() {
		PDF.zoom = PDF.zoom * (1 + PDF.zoomFactor);
		renderView(PDF.pageNum.left, 'left');
		renderView(PDF.pageNum.right, 'right');
	}

	/**
	 * set the page title
	 *
	 * @param pdfDoc_
	 */
	function setTitle(pdfDoc) {
		pdfDoc.getMetadata().then(function(metadata) {
			let title = metadata.metadata.get('dc:title');
			document.getElementById("title").innerText = title;
			document.title = title;
		});
	}

});
