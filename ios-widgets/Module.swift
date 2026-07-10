import ExpoModulesCore
import WidgetKit

private let widgetSuiteName = "group.com.tihshkel.x018BY.expowidgets"
private let widgetDataKey = "WidgetSnapshot"

public class ExpoWidgetsModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoWidgets")

        Function("setWidgetData") { (data: String) -> Void in
            guard let widgetSuite = UserDefaults(suiteName: widgetSuiteName) else {
                #if DEBUG
                print("[ExpoWidgets] App Group unavailable: \(widgetSuiteName)")
                #endif
                return
            }
            widgetSuite.set(data, forKey: widgetDataKey)

            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }
}
