import Foundation
import Capacitor
import StoreKit

/// StoreKit 2 bridge for the one-time "full game" unlock. JS side: registerPlugin('BlackspireStore') in src/entitlements.js.
/// Non-consumable product: com.gorillastocks.blackspire.fullgame (App Store Connect, or Blackspire.storekit for local testing).
/// Needs iOS 15+ (StoreKit 2). Requires the "In-App Purchase" capability on the App target.
/// NOTE: written without a Mac, so this file has never been compiled or run. See IOS_BUILD.md, "In-app purchase".
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "BlackspireStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]
    private let productId = "com.gorillastocks.blackspire.fullgame"
    private var updatesTask: Task<Void, Never>?

    /// Listen for transactions that finish outside a purchase call (Ask to Buy approvals, refunds, other devices).
    override public func load() {
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                guard let self = self else { return }
                if case .verified(let transaction) = update { await transaction.finish() }
                let owned = await self.isOwned()
                self.notifyListeners("entitlement", data: ["owned": owned])
            }
        }
    }

    deinit { updatesTask?.cancel() }

    /// True when a verified, non-revoked transaction for the unlock exists (Transaction.currentEntitlements).
    private func isOwned() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == productId,
               transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }

    @objc func getProduct(_ call: CAPPluginCall) {
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    return call.reject("Product not found: \(productId)")
                }
                call.resolve(["id": product.id, "displayPrice": product.displayPrice, "displayName": product.displayName])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func getEntitlements(_ call: CAPPluginCall) {
        Task {
            let owned = await isOwned()
            call.resolve(["owned": owned])
        }
    }

    /// Resolves { status: "purchased" | "pending" | "cancelled" | "failed", message? }. Never rejects.
    @objc func purchase(_ call: CAPPluginCall) {
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    return call.resolve(["status": "failed", "message": "The product is not available right now."])
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["status": "purchased"])
                    case .unverified:
                        call.resolve(["status": "failed", "message": "The purchase could not be verified."])
                    }
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.resolve(["status": "failed", "message": "Unknown purchase result."])
                }
            } catch {
                call.resolve(["status": "failed", "message": error.localizedDescription])
            }
        }
    }

    /// Restore Purchases: sync with the App Store (may ask the player to sign in), then re-read currentEntitlements.
    /// Resolves { status: "ok", owned: Bool } or { status: "failed", message }.
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                let owned = await isOwned()
                call.resolve(["status": "ok", "owned": owned])
            } catch {
                call.resolve(["status": "failed", "message": error.localizedDescription])
            }
        }
    }
}
