import UIKit
import Capacitor

/// Bridge view controller that registers the app-local ICloudKV plugin (set as the class in Main.storyboard).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ICloudKVPlugin())
    }
}
