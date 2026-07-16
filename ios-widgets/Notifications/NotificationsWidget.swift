import SwiftUI
import WidgetKit

struct NotificationsEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    private var todayNotifications: [WidgetInboxNotificationItem] {
        entry.snapshot.todayNotifications
    }

    private var latest: WidgetInboxNotificationItem? {
        entry.snapshot.latestNotification
    }

    var body: some View {
        Group {
            if let latest {
                content(latest)
            } else {
                WidgetEmptyState(
                    title: "Тихий день",
                    subtitle: "Сегодня уведомлений пока нет"
                )
                .widgetURL(WidgetDeepLinks.notifications)
            }
        }
    }

    @ViewBuilder
    private func content(_ latest: WidgetInboxNotificationItem) -> some View {
        switch family {
        case .systemSmall:
            smallView(latest)
        case .systemMedium:
            mediumView(latest)
        case .systemLarge:
            largeView
        case .accessoryInline:
            Text(WidgetFormatters.trimText(latest.title, maxLength: 32))
                .font(.system(size: 12, weight: .semibold))
                .widgetURL(WidgetDeepLinks.notifications)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(WidgetFormatters.trimText(latest.title, maxLength: 36))
                    .font(.system(size: 12, weight: .semibold))
                Text(WidgetFormatters.trimText(latest.body, maxLength: 48))
                    .font(.system(size: 11))
                    .lineLimit(2)
            }
            .widgetURL(WidgetDeepLinks.notifications)
        default:
            smallView(latest)
        }
    }

    private func smallView(_ latest: WidgetInboxNotificationItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                WidgetMetricLabel(text: "Уведомления")
                Spacer()
                if entry.snapshot.unreadTodayCount > 0 {
                    Text("\(entry.snapshot.unreadTodayCount)")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(WidgetColors.primaryDeep)
                }
            }
            Text(latest.title)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(2)
            if !latest.body.isEmpty {
                Text(WidgetFormatters.trimText(latest.body, maxLength: 80))
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(3)
            }
            Spacer(minLength: 0)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.notifications)
    }

    private func mediumView(_ latest: WidgetInboxNotificationItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                WidgetMetricLabel(text: "Уведомления")
                Spacer()
                if entry.snapshot.unreadTodayCount > 0 {
                    Text("\(entry.snapshot.unreadTodayCount) сегодня")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(palette.textSecondary)
                }
            }
            Text(latest.title)
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(2)
            if !latest.body.isEmpty {
                Text(WidgetFormatters.trimText(latest.body, maxLength: 140))
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(4)
            }
            Spacer(minLength: 0)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.notifications)
    }

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            WidgetMetricLabel(text: "Сегодня")
            if todayNotifications.isEmpty, let latest {
                notificationRow(latest)
            } else {
                ForEach(Array(todayNotifications.prefix(4).enumerated()), id: \.offset) { _, item in
                    notificationRow(item)
                }
            }
            Spacer(minLength: 0)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.notifications)
    }

    private func notificationRow(_ item: WidgetInboxNotificationItem) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(item.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(1)
            if !item.body.isEmpty {
                Text(WidgetFormatters.trimText(item.body, maxLength: 100))
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(palette.textSecondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
}

struct NotificationsWidget: Widget {
    let kind = "NotificationsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            NotificationsEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Уведомления")
        .description("Текст напоминаний за сегодня.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryInline,
            .accessoryRectangular,
        ])
        .containerBackgroundRemovable(true)
    }
}
