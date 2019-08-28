(function(pdfjsLib, pdfURL) {

    document.addEventListener("DOMContentLoaded", function(event) {

        // Loaded via <script> tag, create shortcut to access PDF.js exports.
        // var pdfjsLib = window['pdfjs-dist/build/pdf']; // IMPROVE - what is this used for and does this need to be updated with my path to pdf.js?

        // The workerSrc property shall be specified.
        pdfjsLib.GlobalWorkerOptions.workerSrc = './include/js/pdfjs-2.0.943-dist/build/pdf.worker.js';

        let PDF;
        if (pdf_format === 'portrait') {
            PDF = {
                pdfDoc: {left: null, right: null},
                pageNum: {left: 1, right: 2},
                pageRendering: {left: false, right: false},
                pageNumPending: {left: null, right: null},
                canvas: {left: document.getElementById('left-canvas'), right: document.getElementById('right-canvas')},
                zoom: 1,
                zoomFactor: 0.2
            };

            PDF.ctx = {
                left: PDF.canvas.left.getContext('2d'),
                right: PDF.canvas.right.getContext('2d')
            };
        } else { // landscape
            PDF = {
                pdfDoc: {center: null},
                pageNum: {center: 1},
                pageRendering: {center: false},
                pageNumPending: {center: null},
                canvas: {center: document.getElementById('center-canvas')},
                zoom: 1,
                zoomFactor: 0.2
            };

            PDF.ctx = {
                center: PDF.canvas.center.getContext('2d')
            };
        }

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

            // show loading icon for downloading PDF
            document.getElementById("banner").style.display = "none";
            document.getElementById("pdf-container").style.display = "none";
            document.getElementById("downloading-pdf-loading-icon").style.display = "block";

            pdfjsLib.getDocument(pdfURL).then(function(pdfDoc_) {

                // hide loading icon for downloading PDF
                document.getElementById("banner").style.display = "block";
                document.getElementById("pdf-container").style.display = "block";
                document.getElementById("downloading-pdf-loading-icon").style.display = "none";

                if (pdf_format === 'portrait') {
                    PDF.pdfDoc.left = pdfDoc_;
                    PDF.pdfDoc.right = pdfDoc_;
                    document.getElementById('page_count').textContent = PDF.pdfDoc.left.numPages;
                } else {
                    PDF.pdfDoc.center = pdfDoc_;
                    document.getElementById('page_count').textContent = PDF.pdfDoc.center.numPages;
                }

                setTitle(pdfDoc_);

                // resize pages on resize event (specifically when resizing is done).
                // based on: https://css-tricks.com/snippets/jquery/done-resizing-event/
                window.addEventListener('resize', function() {
                    window.clearTimeout(resizeTimer);
                    resizeTimer = window.setTimeout(function() {
                        if (pdf_format === 'portrait') {
                            renderView(PDF.pageNum.left, 'left');
                            renderView(PDF.pageNum.right, 'right');
                        } else { // landscape
                            renderView(PDF.pageNum.center, 'center');
                        }

                    }, 250);

                });

                // Initial/first page rendering
                if (pdf_format === 'portrait') {
                    renderView(PDF.pageNum.left, 'left');
                    renderView(PDF.pageNum.right, 'right');
                } else {
                    renderView(PDF.pageNum.center, 'center');
                }
            });
        }

        /**
         * Get page info from document, resize canvas accordingly, and render page.
         * @param page_num  - Page number.
         * @param side - which page / canvas to render.
         */
        function renderView(page_num, side) {
            if (side === 'right' && PDF.pageNum.right > PDF.pdfDoc.right.numPages) {
                PDF.canvas[side].style.display = 'none';
                return;
            } else {
                PDF.canvas[side].style.display = 'inline-block';
            }

            PDF.pageRendering[side] = true;
            disableButtons();

            // Using promise to fetch the page
            PDF.pdfDoc[side].getPage(page_num).then(function(page) {
                let borderThickness = 1;
                let desiredWidth;
                if (side === 'center') {
                    desiredWidth = windowWidth() - borderThickness;
                } else {
                    desiredWidth = (windowWidth() / 2) - borderThickness;
                }
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
                } else if (side === 'center') {
                    let diff = PDF.canvas.center.width - scaledViewport.width;
                    if (diff > 0) {
                        h = diff/2;
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
                    enableButtons();
                    if (PDF.pageNumPending[side] !== null) {
                        // New page rendering is pending
                        renderView(PDF.pageNumPending[side], page);
                        PDF.pageNumPending[side] = null;
                    }
                });
            });

            // Update page counters
            if (side === 'left' || side === 'center') {
                document.getElementById('page_num').textContent = page_num;
            }
        }

        /**
         *
         */
        function disableButtons() {
            document.getElementById("prev").setAttribute('disabled', 'disabled');
            document.getElementById("next").setAttribute('disabled', 'disabled');
            showLoadingIcons();
        }

        /**
         *
         */
        function enableButtons() {
            let enableButtons = (
                (
                    pdf_format === 'portrait' &&
                    PDF.pageRendering.left === false &&
                    PDF.pageRendering.right === false
                ) ||
                (
                    pdf_format === 'landscape' &&
                    PDF.pageRendering.center === false
                )
            );

            if (enableButtons) {
                document.getElementById("prev").removeAttribute('disabled');
                document.getElementById("next").removeAttribute('disabled');
            }

            showLoadingIcons();
        }

        /**
         *
         */
        function showLoadingIcons() {
            // IMPROVE - A LOT OF DUPLICATE CODE

            if (pdf_format === 'portrait') {
                if (PDF.pageRendering.left) {
                    document.getElementById("loading-icon-left").style.display = 'inline-block';
                    PDF.canvas.left.style.display = 'none';
                } else {
                    document.getElementById("loading-icon-left").style.display = 'none';
                    PDF.canvas.left.style.display = 'inline-block';
                }

                if (PDF.pageRendering.right) {
                    document.getElementById("loading-icon-right").style.display = 'inline-block';
                    PDF.canvas.right.style.display = 'none';
                } else {
                    document.getElementById("loading-icon-right").style.display = 'none';
                    if (PDF.pageNum.right > PDF.pdfDoc.right.numPages) {
                        PDF.canvas.right.style.display = 'none';
                    } else {
                        PDF.canvas.right.style.display = 'inline-block';
                    }
                }
            } else {
                if (PDF.pageRendering.center) {
                    document.getElementById("loading-icon-center").style.display = 'inline-block';
                    PDF.canvas.center.style.display = 'none';
                } else {
                    document.getElementById("loading-icon-center").style.display = 'none';
                    if (PDF.pageNum.center > PDF.pdfDoc.center.numPages) {
                        PDF.canvas.center.style.display = 'none';
                    } else {
                        PDF.canvas.center.style.display = 'inline-block';
                    }
                }
            }
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
            // IMPROVE - DUPLICATE CODE

            // THIS IS A SIMPLE FIX FOR THE PROBLEM OF THE USER CLICKING ON
            // THE PREV/NEXT BUTTON REALLY FAST WHICH RESULTS IN BOTH CANVASES SHOWING
            // THE SAME PAGE.  IMPROVE - COME UP WITH A BETTER SOLUTION
            if (pdf_format === 'portrait') {
                if (PDF.pageRendering.left || PDF.pageRendering.right) {
                    return;
                }

                if (PDF.pageNum.left <= 1) {
                    return;
                }
                
                if (showingPageRightAfterCoverPage()) {
                    PDF.pageNum.left = PDF.pageNum.left - 1;
                    PDF.pageNum.right = PDF.pageNum.right - 1;
                } else {
                    PDF.pageNum.left = PDF.pageNum.left - 2;
                    PDF.pageNum.right = PDF.pageNum.right - 2;
                }

                queueRenderPage('left', PDF.pageNum.left);
                queueRenderPage('right', PDF.pageNum.right);
            } else {
                if (PDF.pageRendering.center) {
                    return;
                }

                if (PDF.pageNum.center <= 1) {
                    return;
                }

                PDF.pageNum.center = PDF.pageNum.center - 1;

                queueRenderPage('center', PDF.pageNum.center);
            }


        }

        /**
         * Displays next page.
         */
        function onNextPage() {
            // THIS IS A SIMPLE FIX FOR THE PROBLEM OF THE USER CLICKING ON
            // THE PREV/NEXT BUTTON REALLY FAST WHICH RESULTS IN BOTH CANVASES SHOWING
            // THE SAME PAGE.  IMPROVE - COME UP WITH A BETTER SOLUTION
            if (pdf_format === 'portrait') {
                if (PDF.pageRendering.left || PDF.pageRendering.right) {
                    return;
                }

                if (PDF.pageNum.left >= PDF.pdfDoc.left.numPages - 1) {
                    return;
                }

                // if (coverPage('next')) {
                if (showingCoverPage()) {
                    PDF.pageNum.left = PDF.pageNum.left + 1;
                    PDF.pageNum.right = PDF.pageNum.right + 1;
                } else {
                    PDF.pageNum.left = PDF.pageNum.left + 2;
                    PDF.pageNum.right = PDF.pageNum.right + 2;
                }

                queueRenderPage('left', PDF.pageNum.left);
                queueRenderPage('right', PDF.pageNum.right);
            } else {
                if (PDF.pageRendering.center) {
                    return;
                }

                if (PDF.pageNum.center >= PDF.pdfDoc.center.numPages) {
                    return;
                }

                PDF.pageNum.center = PDF.pageNum.center + 1;

                queueRenderPage('center', PDF.pageNum.center);
            }

        }

        /**
         * Determine if the user is leaving the cover page
         * or
         * if they are trying to go back to the cover page
         *
         * The cover page (for pdf_format === portrait) is handled
         * differently than the other pages
         *
         * @param direction
         * @returns {boolean}
         */
        // function coverPage(direction) {
        //     if (direction === 'next') {
        //         return (PDF.pageNum.left === 1);
        //     } else { // previous
        //         return (PDF.pageNum.left === 2);
        //     }
        // }

        function showingCoverPage() {
            return (PDF.pageNum.left === 1);
        }

        function showingPageRightAfterCoverPage() {
            return (PDF.pageNum.left === 2);
        }

        /**
         * zoom out / decrease page magification
         */
        function onZoomOut() {
            PDF.zoom = PDF.zoom * (1 - PDF.zoomFactor);
            if (PDF.zoom < 1) PDF.zoom = 1;
            if (pdf_format === 'portrait') {
                renderView(PDF.pageNum.left, 'left');
                renderView(PDF.pageNum.right, 'right');
            } else {
                renderView(PDF.pageNum.center, 'center');
            }
        }

        /**
         * zoom in / increase page magification
         */
        function onZoomIn() {
            PDF.zoom = PDF.zoom * (1 + PDF.zoomFactor);
            if (pdf_format === 'portrait') {
                renderView(PDF.pageNum.left, 'left');
                renderView(PDF.pageNum.right, 'right');
            } else {
                renderView(PDF.pageNum.center, 'center');
            }
        }

        /**
         * set the page title
         *
         * @param pdfDoc_
         */
        function setTitle(pdfDoc) {
            pdfDoc.getMetadata().then(function(metadata) {
                let title = metadata.metadata.get('dc:title');
                let titleElem = document.getElementById("title");
                if (!empty(title)) {
                    titleElem.innerText = title;
                    document.title = title;
                } else {
                    titleElem.parentNode.removeChild(titleElem);
                    document.title = 'PDF -- SSEC';
                }
            });
        }

        /**
         * equivalent of PHP empty()
         *
         * source: http://locutus.io/php/empty/
         *
         * @param mixedVar
         * @returns {boolean}
         */
        function empty(mixedVar) {
            let undef;
            let key;
            let i;
            let len;
            let emptyValues = [undef, null, false, 0, '', '0'];

            for (i = 0, len = emptyValues.length; i < len; i++) {
                if (mixedVar === emptyValues[i]) {
                    return true
                }
            }

            if (typeof mixedVar === 'object') {
                for (key in mixedVar) {
                    if (mixedVar.hasOwnProperty(key)) {
                        return false
                    }
                }
                return true
            }

            return false
        }

    });

})(pdfjsLib, pdfURL);
