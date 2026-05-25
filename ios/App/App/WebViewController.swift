import UIKit
import WebKit

class WebViewController: UIViewController, WKNavigationDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.processPool = WKProcessPool() // Shared pool for persistent sessions

        webView = WKWebView(frame: .zero, configuration: webConfiguration)
        webView.navigationDelegate = self
        view = webView

        if let url = URL(string: "https://app.dwelco.ai") {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    // Ensure links stay inside the app
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(.allow)
    }
}
