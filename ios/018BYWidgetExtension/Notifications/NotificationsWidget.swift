import SwiftUI
import WidgetKit

struct NotificationsEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry
    private var latest: WidgetInboxNotificationItem? { entry.snapshot.latestNotification }
    private var next: WidgetContinueItem? { entry.snapshot.continueProject }
    private var destination: URL {
        if latest != nil { return WidgetDeepLinks.notifications }
        if let next { return WidgetDeepLinks.continueProject(next) }
        return entry.snapshot.albumsCount == 0 ? WidgetDeepLinks.createAlbum : WidgetDeepLinks.stories
    }
    private var title: String { latest?.title ?? (next == nil ? "Место для новых историй" : "Ваш альбом ждёт продолжения") }
    private var detail: String { latest?.body ?? next.map { "«\($0.pageTitle)» — сохраните ещё один важный момент." } ?? "Откройте альбом и вернитесь к любимым моментам." }
    private var action: String { latest != nil ? "Открыть уведомления" : next != nil ? "Продолжить историю" : entry.snapshot.albumsCount == 0 ? "Начать историю" : "Мои истории" }
    private var isToday: Bool {
        guard let latest, let date = WidgetFormatters.parseDate(latest.receivedAt) else { return false }
        return Calendar.current.isDate(date, inSameDayAs: entry.date)
    }

    var body: some View {
        Group {
            switch family {
            case .accessoryInline: Label(title, systemImage: latest == nil ? "book.closed" : "bell")
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                    Text(detail).font(.system(size: 11)).lineLimit(2)
                }
            case .systemLarge: large
            default: card
            }
        }.widgetURL(destination)
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 7) {
            WidgetHeader(title: latest == nil ? "Для вашей истории" : isToday ? "Сегодня" : "Последнее сообщение", icon: latest == nil ? "book.closed" : "envelope")
            Spacer(minLength: 0)
            Text(title).font(.system(size: family == .systemSmall ? 15 : 17, weight: .semibold))
                .foregroundStyle(palette.textPrimary).lineLimit(2).minimumScaleFactor(0.85)
            if !detail.isEmpty {
                Text(detail).font(.system(size: family == .systemSmall ? 11 : 12)).foregroundStyle(palette.textSecondary).lineLimit(2)
            }
            Spacer(minLength: 0)
            HStack(spacing: 8) {
                if family == .systemMedium, let latest {
                    WidgetAccentPill(text: isToday ? "Сегодня" : WidgetFormatters.shortDate(latest.receivedAt))
                }
                WidgetCallToAction(title: action)
            }
        }
        .background(alignment: .topTrailing) {
            WidgetKeepsakeStamp(symbol: "envelope", category: "diary", size: 60)
                .opacity(0.09).rotationEffect(.degrees(12)).padding(.top, 19).padding(.trailing, 4)
        }
        .widgetCardBackground()
    }

    private var large: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "Для вашей истории", icon: "envelope")
            HStack {
                Text(isToday ? "Сегодня" : latest == nil ? "Новый момент" : "Последнее сообщение")
                    .font(.system(size: 20, weight: .semibold)).foregroundStyle(palette.textPrimary)
                Spacer(minLength: 4)
                if entry.snapshot.unreadTodayCount > 0 { WidgetAccentPill(text: "\(entry.snapshot.unreadTodayCount) за день") }
            }
            if let latest {
                let rows = entry.snapshot.todayNotifications.isEmpty ? [latest] : entry.snapshot.todayNotifications
                ForEach(Array(rows.prefix(3)), id: \.id) { item in
                    Link(destination: WidgetDeepLinks.notifications) { notificationRow(item) }.buttonStyle(.plain)
                }
            } else {
                Text(detail).font(.system(size: 15)).foregroundStyle(palette.textSecondary).lineLimit(3)
            }
            Spacer(minLength: 0)
            if let next {
                Link(destination: WidgetDeepLinks.continueProject(next)) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(next.pageTitle).font(.system(size: 13, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(1)
                        WidgetCallToAction(title: "Продолжить альбом")
                    }.widgetSectionCard()
                }.buttonStyle(.plain)
            } else {
                WidgetCallToAction(title: action, filled: true)
            }
        }.widgetCardBackground()
    }

    private func notificationRow(_ item: WidgetInboxNotificationItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(item.title).font(.system(size: 13, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(1)
            if !item.body.isEmpty { Text(item.body).font(.system(size: 11)).foregroundStyle(palette.textSecondary).lineLimit(1) }
        }.frame(maxWidth: .infinity, alignment: .leading).widgetSectionCard(padding: 6)
    }
}

struct NotificationsWidget: Widget {
    let kind = "NotificationsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            NotificationsEntryView(entry: entry).widgetHomeScreenContainer()
        }
        .configurationDisplayName("Для вашей истории")
        .description("Сообщения из приложения и быстрый переход к продолжению альбома.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryInline, .accessoryRectangular])
        .contentMarginsDisabled()
        .containerBackgroundRemovable(true)
    }
}
