import SwiftUI
import WidgetKit

@main
struct BYWidgetBundle: WidgetBundle {
    var body: some Widget {
        QuickAccessWidget()
        MyProjectsWidget()
        ContinueWidget()
        ReminderWidget()
        PregnancyWidget()
    }
}
