(function(pdfjsLib) {

    var PDF;
    var RESIZE_TIMER;
    var PDF_FORMAT;

    document.addEventListener("DOMContentLoaded", init);


    //============================================================================
    // FUNCTIONS
    //============================================================================

    /**
     *
     */
    function init() {

        var query = getQueryStringArray();
        var pdfURL = query['pdf'];
        if (!validatePDF_URL(pdfURL)) {
            document.getElementById('pdf-container').innerHTML = '<div id="error-message">' +
                '<p>Invalid PDF</p>' +
                '</div>';
            return;
        }
        PDF_FORMAT = getPdfFormat(query);

        // update DOM
        document.getElementById("pdf-download").setAttribute('href', pdfURL);
        document.getElementById("pdf-container").classList.add(PDF_FORMAT);

        // The workerSrc property shall be specified.
        pdfjsLib.GlobalWorkerOptions.workerSrc = './include/js/pdfjs-2.0.943-dist/build/pdf.worker.min.js';

        // initialize PDF object
        if (PDF_FORMAT === 'portrait') {
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

        // controls - setup event handlers to make buttons work
        document.getElementById('next').addEventListener('click', onNextPage);
        document.getElementById('prev').addEventListener('click', onPrevPage);

        document.getElementById('zoomout').addEventListener('click', onZoomOut);
        document.getElementById('zoomin').addEventListener('click', onZoomIn);

        // show loading icon for downloading PDF
        document.getElementById("banner").style.display = "none";
        document.getElementById("pdf-container").style.display = "none";
        document.getElementById("downloading-pdf-loading-icon").style.display = "block";

        initPdfjsLib(pdfURL);
    }

    /**
     *
     */
    function initPdfjsLib(pdfURL) {
        // document.getElementById('next').addEventListener('click', onNextPage);
        // document.getElementById('prev').addEventListener('click', onPrevPage);
        //
        // document.getElementById('zoomout').addEventListener('click', onZoomOut);
        // document.getElementById('zoomin').addEventListener('click', onZoomIn);
        //
        // // show loading icon for downloading PDF
        // document.getElementById("banner").style.display = "none";
        // document.getElementById("pdf-container").style.display = "none";
        // document.getElementById("downloading-pdf-loading-icon").style.display = "block";

        pdfjsLib.getDocument(pdfURL).then(function(pdfDoc_) {

            // hide loading icon for downloading PDF
            document.getElementById("banner").style.display = "block";
            document.getElementById("pdf-container").style.display = "block";
            document.getElementById("downloading-pdf-loading-icon").style.display = "none";

            if (PDF_FORMAT === 'portrait') {
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
                window.clearTimeout(RESIZE_TIMER);
                RESIZE_TIMER = window.setTimeout(function() {
                    if (PDF_FORMAT === 'portrait') {
                        renderView(PDF.pageNum.left, 'left');
                        renderView(PDF.pageNum.right, 'right');
                    } else { // landscape
                        renderView(PDF.pageNum.center, 'center');
                    }

                }, 250);

            });

            // Initial/first page rendering
            if (PDF_FORMAT === 'portrait') {
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
            var borderThickness = 1;
            var desiredWidth;
            if (side === 'center') {
                desiredWidth = windowWidth() - borderThickness;
            } else {
                desiredWidth = (windowWidth() / 2) - borderThickness;
            }
            var desiredHeight = windowHeight() - document.getElementById('banner').offsetHeight;
            desiredWidth = desiredWidth * PDF.zoom;
            desiredHeight = desiredHeight * PDF.zoom;

            var viewport = page.getViewport(1);
            var scale1 = desiredWidth / viewport.width;
            var scale2 = desiredHeight / viewport.height;
            var scaledViewport;

            if (scale1 >= scale2) {
                scaledViewport = page.getViewport(scale2);
            } else {
                scaledViewport = page.getViewport(scale1);
            }

            PDF.canvas[side].height = desiredHeight;
            PDF.canvas[side].width = desiredWidth;

            // align left page to the right by setting the horizontal factor in the canvas transformation matrix
            var h = 0;
            var diff;
            if (side === 'left') {
                diff = PDF.canvas.left.width - scaledViewport.width;
                if (diff > 0) {
                    h = diff;
                }
            } else if (side === 'center') {
                diff = PDF.canvas.center.width - scaledViewport.width;
                if (diff > 0) {
                    h = diff / 2;
                }
            }

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: PDF.ctx[side],
                viewport: scaledViewport,
                transform: [1, 0, 0, 1, h, 0]
            };
            var renderTask = page.render(renderContext);

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
        var enableButtons = (
            (
                PDF_FORMAT === 'portrait' &&
                PDF.pageRendering.left === false &&
                PDF.pageRendering.right === false
            ) ||
            (
                PDF_FORMAT === 'landscape' &&
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

        if (PDF_FORMAT === 'portrait') {
            var icons = document.querySelectorAll('.loading-icon-left');
            var i;

            if (PDF.pageRendering.left) {
                for (i = 0; i < icons.length; i++) {
                    icons[i].style.display = 'inline-block';
                }

                PDF.canvas.left.style.display = 'none';
            } else {
                for (i = 0; i < icons.length; i++) {
                    icons[i].style.display = 'none';
                }
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
        if (PDF_FORMAT === 'portrait') {
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
        if (PDF_FORMAT === 'portrait') {
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
     *
     * @returns {boolean}
     */
    function showingCoverPage() {
        return (PDF.pageNum.left === 1);
    }

    /**
     *
     * @returns {boolean}
     */
    function showingPageRightAfterCoverPage() {
        return (PDF.pageNum.left === 2);
    }

    /**
     * zoom out / decrease page magification
     */
    function onZoomOut() {
        PDF.zoom = PDF.zoom * (1 - PDF.zoomFactor);
        if (PDF.zoom < 1) PDF.zoom = 1;
        if (PDF_FORMAT === 'portrait') {
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
        if (PDF_FORMAT === 'portrait') {
            renderView(PDF.pageNum.left, 'left');
            renderView(PDF.pageNum.right, 'right');
        } else {
            renderView(PDF.pageNum.center, 'center');
        }
    }

    /**
     * set the page title
     *
     * @param pdfDoc
     * @param pdfDoc.getMetadata
     */
    function setTitle(pdfDoc) {
        pdfDoc.getMetadata().then(function(metadata) {
            var title = metadata.metadata.get('dc:title');
            var titleElem = document.getElementById("title");
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
        var undef;
        var key;
        var i;
        var len;
        // noinspection JSUnusedAssignment
        var emptyValues = [undef, null, false, 0, '', '0'];

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

    // TODO

    /**
     *
     * @param query
     * @returns {*|string}
     */
    function getPdfFormat(query) {
        var pdf_format = (query.hasOwnProperty('pdf_format')) ? query['pdf_format'] : 'portrait';

        if (!inArray(pdf_format, ['portrait', 'landscape'])) {
            pdf_format = 'portrait';
        }

        return pdf_format;
    }

    /**
     *
     * @param needle
     * @param haystack
     * @returns {boolean}
     */
    function inArray(needle, haystack) {
        var length = haystack.length;
        for (var i = 0; i < length; i++) {
            if (haystack[i] === needle) return true;
        }
        return false;
    }

    /**
     * Function to get the parameters and their values from a query string
     */
    function getQueryStringArray() {
        /*
        get the query string and then return as an array of
        [param] = value
        pairs
        */

        var params = [];

        // get query string
        var rExp = /\?.*$/;
        var queryStringIndex = window.top.location.href.search(rExp);
        if (queryStringIndex < 0) return params; // if no query string then return an empty array
        var queryString = window.top.location.href.substr(queryStringIndex + 1);

        rExp = /#/;
        var ind = queryString.search(rExp);
        if (ind !== -1) {
            queryString = queryString.substr(0, ind);
        }

        // break up into an array
        var paramStrings = queryString.split('&');
        var k = [];
        for (var i = 0; i < paramStrings.length; i++) {
            k = paramStrings[i].split('=');
            params[k[0]] = k[1];
        }

        return params;
    }

    /**
     * parse a URL, works in IE.
     *
     * Example:
     * var myUrl = new ParsedUrl("http://www.example.com:8080/path?query=123#fragment");
     * Result:
     * {
     *      hash: "#fragment"
     *      host: "www.example.com:8080"
     *      hostname: "www.example.com"
     *      href: "http://www.example.com:8080/path?query=123#fragment"
     *      pathname: "/path"
     *      port: "8080"
     *      protocol: "http:"
     *      search: "?query=123"
     * }
     *
     * Source: https://gist.github.com/acdcjunior/9820040
     * @param url
     */
    function ParsedUrl(url) {
        var parser = document.createElement("a");
        parser.href = url;

        // IE 8 and 9 dont load the attributes "protocol" and "host" in case the source URL
        // is just a pathname, that is, "/example" and not "http://domain.com/example".
        // parser.href = parser.href;

        // IE 7 and 6 wont load "protocol" and "host" even with the above workaround,
        // so we take the protocol/host from window.location and place them manually
        if (parser.host === "") {
            var newProtocolAndHost = window.location.protocol + "//" + window.location.host;
            if (url.charAt(1) === "/") {
                parser.href = newProtocolAndHost + url;
            } else {
                // the regex gets everything up to the last "/"
                // /path/takesEverythingUpToAndIncludingTheLastForwardSlash/thisIsIgnored
                // "/" is inserted before because IE takes it of from pathname
                var currentFolder = ("/" + parser.pathname).match(/.*\//)[0];
                parser.href = newProtocolAndHost + currentFolder + url;
            }
        }

        // copies all the properties to this object
        var properties = ['host', 'hostname', 'hash', 'href', 'port', 'protocol', 'search'];
        for (var i = 0, n = properties.length; i < n; i++) {
            this[properties[i]] = parser[properties[i]];
        }

        // pathname is special because IE takes the "/" of the starting of pathname
        this.pathname = (parser.pathname.charAt(0) !== "/" ? "/" : "") + parser.pathname;
    }

    /**
     * get file extension
     * Source: https://stackoverflow.com/questions/680929/how-to-extract-extension-from-filename-string-in-javascript/680982
     * @param filename
     */
    function fileExtension(filename) {
        var re = /(?:\.([^.]+))?$/;
        var file_extension = re.exec(filename);

        if (file_extension.length === 2) {
            return file_extension[1].toLowerCase();
        } else {
            return "";
        }
    }

    /**
     *
     * @param pdfURL
     */
    function validatePDF_URL(pdfURL) {
        var valid_hostname = window.location.hostname;

        var parsed_url = new ParsedUrl(pdfURL);

        if (parsed_url.hostname !== valid_hostname) {
            return false;
        }

        return (fileExtension(pdfURL) === 'pdf');
    }

})(pdfjsLib);
