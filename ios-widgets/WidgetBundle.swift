import SwiftUI
import WidgetKit

@main
struct BYWidgetBundle: WidgetBundle {
    var body: some Widget {
        ContinueWidget()
        QuickAccessWidget()
        MyProjectsWidget()
        ReminderWidget()
        PregnancyWidget()
        NotificationsWidget()
    }
}
