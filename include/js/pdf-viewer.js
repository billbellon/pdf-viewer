document.addEventListener("DOMContentLoaded", function(event) {

	// Loaded via <script> tag, create shortcut to access PDF.js exports.
	// var pdfjsLib = window['pdfjs-dist/build/pdf']; // DEBUG - what is this used for and does this need to be updated with my path to pdf.js?

	// The workerSrc property shall be specified.
	pdfjsLib.GlobalWorkerOptions.workerSrc = './include/js/pdfjs-2.0.943-dist/build/pdf.worker.js';

	let PDF = {
		pdfDoc: [null, null],
		pageNum: [1, 2],
		pageRendering: [false, false],
		pageNumPending: [null, null],
		canvas: [document.getElementById('the-canvas'), document.getElementById('the-canvas-2')],
		zoom: 1,
		zoomFactor: 0.2
	};
	PDF.ctx = [
		PDF.canvas[0].getContext('2d'),
		PDF.canvas[1].getContext('2d')
	];
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
			PDF.pdfDoc[0] = pdfDoc_;
			PDF.pdfDoc[1] = pdfDoc_;

			setTitle(pdfDoc_);

			document.getElementById('page_count').textContent = PDF.pdfDoc[0].numPages;

			// resize pdf's on resize event (specifically when resizing is done).
			// based on: https://css-tricks.com/snippets/jquery/done-resizing-event/
			window.addEventListener('resize', function(){
				window.clearTimeout(resizeTimer);
				resizeTimer = window.setTimeout(function(){
					renderView(PDF.pageNum[0], 0);
					renderView(PDF.pageNum[1], 1);
				}, 250);

			});

			// Initial/first page rendering
			renderView(PDF.pageNum[0], 0);
			renderView(PDF.pageNum[1], 1);
		});
	}

	/**
	 * Get page info from document, resize canvas accordingly, and render page.
	 * @param page_num  - Page number.
	 * @param side - which page / canvas to render.
	 */
	function renderView(page_num, side) {
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

			if ( scale1 >= scale2 ) {
				scaledViewport = page.getViewport(scale2);
			} else {
				scaledViewport = page.getViewport(scale1);
			}

			PDF.canvas[side].height = desiredHeight;
			PDF.canvas[side].width = desiredWidth;

			// align left page to the right by setting the horizontal factor in the canvas transformation matrix
			let h = 0;
			if ( side === 0 ) {
				let diff = PDF.canvas[0].width - scaledViewport.width;
				if ( diff > 0 ) {
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
		if (PDF.pageRendering[0] || PDF.pageRendering[1]) {
			return;
		}

		if (PDF.pageNum[0] <= 1) {
			return;
		}
		if (PDF.pageNum[1] <= 2) {
			return;
		}
		PDF.pageNum[0]--;
		PDF.pageNum[1]--;
		queueRenderPage(0, PDF.pageNum[0]);
		queueRenderPage(1, PDF.pageNum[1]);
	}

	/**
	 * Displays next page.
	 */
	function onNextPage() {
		// THIS IS A SIMPLE FIX FOR THE PROBLEM OF THE USER CLICKING ON
		// THE PREV/NEXT BUTTON REALLY FAST WHICH RESULTS IN BOTH CANVASES SHOWING
		// THE SAME PAGE.  IMPROVE - COME UP WITH A BETTER SOLUTION
		if (PDF.pageRendering[0] || PDF.pageRendering[1]) {
			return;
		}


		if (PDF.pageNum[0] >= PDF.pdfDoc[0].numPages-1) {
			return;
		}
		if (PDF.pageNum[1] >= PDF.pdfDoc[1].numPages) {
			return;
		}
		PDF.pageNum[0]++;
		PDF.pageNum[1]++;
		queueRenderPage(0, PDF.pageNum[0]);
		queueRenderPage(1, PDF.pageNum[1]);
	}

	/**
	 * zoom out / decrease page magification
	 */
	function onZoomOut() {
		PDF.zoom = PDF.zoom * (1 - PDF.zoomFactor);
		if (PDF.zoom < 1) PDF.zoom = 1;
		renderView(PDF.pageNum[0], 0);
		renderView(PDF.pageNum[1], 1);
	}

	/**
	 * zoom in / increase page magification
	 */
	function onZoomIn() {
		PDF.zoom = PDF.zoom * (1 + PDF.zoomFactor);
		renderView(PDF.pageNum[0], 0);
		renderView(PDF.pageNum[1], 1);
	}

	/**
	 * set the page title
	 *
	 * @param pdfDoc_
	 */
	function setTitle(pdfDoc) {
		pdfDoc.getMetadata().then(function(metadata){
			let title = metadata.metadata.get('dc:title');
			document.getElementById("title").innerText = title;
			document.title = title;
		});
	}

});
