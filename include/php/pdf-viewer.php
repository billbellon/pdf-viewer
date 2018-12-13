<?php
if ( $_SERVER['SERVER_NAME'] !== 'www.ssec.wisc.edu' ) {
	ini_set( 'display_errors', true );
	error_reporting( E_ALL );

	if ( isset( $_GET['debug'] ) ) {
		$pdfViewer = new PDFViewer();
		$pdfViewer->test();
		die();
	}
}

class PDFViewer {
	public $url = null;

	function __construct()
	{
		if ( isset( $_GET['debug'] ) ) {
			return;
		}

		$this->url = $this->getURL();
		if ( ! empty( $this->url ) ) {
			include_once( __DIR__ . '/../templates/index.php' );
		} else {
			header( "HTTP/1.0 404 Not Found" );
			include_once( __DIR__ . '/../templates/404.php' );
		}

	}

	function getURL( $server_name = null, $pdfPath = null, $debug = false )
	{
		if ( ! empty( $_GET['pdf'] ) ) {
			$pdf = $_GET['pdf'];
		} else if ( $pdfPath !== null ) {
			$pdf = $pdfPath;
		} else {
			return null;
		}

		// only handle PDFs
		$pathinfo = pathinfo( $pdf );
		$file_ext = $pathinfo['extension'];
		if ( $file_ext !== 'pdf' ) {
			return null;
		}

		// remove http://, ftp:// ...
		$pdf = preg_replace( '/^[a-zA-Z]+:\/\//', '', $pdf );

		// strip out ..
		$pdf = str_replace( '..', '', $pdf );

		// remove any / at the beginning
		$pdf = preg_replace( '/^\/+/', '', $pdf );

		// strip out unwanted characters
		$pdf = preg_replace( '/[^a-zA-Z0-9\-_\.\/]/', '', $pdf );

		// make sure file exists
		if ( $debug === false ) {
			$file = rtrim( $_SERVER['DOCUMENT_ROOT'], '/' ) . "/$pdf";
			if ( ! file_exists( $file ) ) {
				return null;
			}
		}

		// handle server name
		if ( $server_name === null ) {
			$server_name = $_SERVER['SERVER_NAME'];
		}

		return "'" . "https://$server_name/$pdf" . "'";
	}

	function test()
	{
		$tests = array();

		// setup tests
		$q = '/pdf-viewer/include/example2.pdf';
		$tests[] = array(
			'q'        => $q,
			'expected' => "'https://www.ssec.wisc.edu/pdf-viewer/include/example2.pdf'",
			'actual__' => $this->getURL( 'www.ssec.wisc.edu', $q, true )
		);

		$q = 'https://cimss.ssec.wisc.edu/pdf-viewer/include/example2.pdf';
		$tests[] = array(
			'q'        => $q,
			'expected' => "'https://www.ssec.wisc.edu/cimss.ssec.wisc.edu/pdf-viewer/include/example2.pdf'",
			'actual__' => $this->getURL( 'www.ssec.wisc.edu', $q, true )
		);

		$q = '/pdf-viewer/in!!clude/ex@@ample2.pdf';
		$tests[] = array(
			'q'        => $q,
			'expected' => "'https://www.ssec.wisc.edu/pdf-viewer/include/example2.pdf'",
			'actual__' => $this->getURL( 'www.ssec.wisc.edu', $q, true )
		);

		$q = 'NOT-A-PDF.jpg';
		$tests[] = array(
			'q'        => $q,
			'expected' => null,
			'actual__' => $this->getURL( 'www.ssec.wisc.edu', $q, true )
		);

		// ok, now test
		foreach ( $tests as $test ) {
			echo '<pre>' . print_r( $test, true ) . '</pre><br>';
			if ( $test['expected'] === $test['actual__'] ) {
				echo 'SUCCESS<br>';
			} else {
				echo 'FAILURE<br>';
			}
			echo "-----------------------------------------<br>";
		}
	}
}