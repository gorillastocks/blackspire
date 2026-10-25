import Foundation
import Capacitor

/// Mirrors Blackspire saves into iCloud Key-Value storage (NSUbiquitousKeyValueStore) so they follow the
/// player to every device signed in to the same Apple Account. JS side: registerPlugin('ICloudKV') in src/storage.js.
/// Requires: Xcode → target App → Signing & Capabilities → + iCloud → tick "Key-value storage".
/// Without that capability the calls succeed but nothing syncs (the game still saves locally).
@objc(ICloudKVPlugin)
public class ICloudKVPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudKVPlugin"
    public let jsName = "ICloudKV"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]
    private let store = NSUbiquitousKeyValueStore.default
    private let maxValueBytes = 900_000 // iCloud KV: 1 MB per key and 1 MB total per app

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(changed(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        store.synchronize()
    }
    @objc func changed(_ note: Notification) {
        let keys = (note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String]) ?? []
        notifyListeners("change", data: ["keys": keys])
    }
    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key required") }
        call.resolve(["value": store.string(forKey: key) as Any])
    }
    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else { return call.reject("key and value required") }
        if value.utf8.count > maxValueBytes { return call.reject("save too large for iCloud key-value storage") }
        store.set(value, forKey: key)
        call.resolve(["synced": store.synchronize()])
    }
    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key required") }
        store.removeObject(forKey: key); store.synchronize(); call.resolve()
    }
}
