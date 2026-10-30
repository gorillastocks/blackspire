import UIKit
import Capacitor

/// Bridge view controller that registers the app-local ICloudKV and BlackspireStore (StoreKit 2) plugins (set as the class in Main.storyboard).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ICloudKVPlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
    }
}
