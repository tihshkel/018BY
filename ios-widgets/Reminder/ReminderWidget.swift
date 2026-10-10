import SwiftUI
import WidgetKit

struct ReminderEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let next = entry.snapshot.nextReminder {
                content(next)
            } else {
                WidgetEmptyState(title: "Для важных моментов", subtitle: "Добавьте дату, чтобы не забыть событие и сохранить его в альбоме.", action: "Добавить дату", icon: "calendar")
            }
        }.widgetURL(WidgetDeepLinks.reminders)
    }

    @ViewBuilder private func content(_ next: WidgetReminderItem) -> some View {
        switch family {
        case .accessoryInline:
            Label("\(WidgetFormatters.daysLabel(next.daysLeft)) · \(next.title)", systemImage: "calendar")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 2) {
                    Image(systemName: "calendar").font(.system(size: 10))
                    Text(next.daysLeft == 0 ? "Сегодня" : "\(next.daysLeft)").font(.system(size: next.daysLeft == 0 ? 9 : 19, weight: .semibold))
                }
            }
        case .systemMedium: medium(next)
        case .systemLarge: large(next)
        default: small(next)
        }
    }

    private func small(_ next: WidgetReminderItem) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            WidgetHeader(title: "Важная дата", icon: "calendar")
            Spacer(minLength: 0)
            HStack(spacing: 10) {
                WidgetCalendarLeaf(dateISO: next.dateISO, size: 42)
                Text(WidgetFormatters.daysLabel(next.daysLeft)).font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.textPrimary).lineLimit(2).minimumScaleFactor(0.85)
            }
            Text(next.title).font(.system(size: 13, weight: .semibold)).foregroundStyle(palette.textPrimary)
                .lineLimit(2).fixedSize(horizontal: false, vertical: true).layoutPriority(1)
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Календарь")
        }.widgetCardBackground()
    }

    private func event(_ next: WidgetReminderItem) -> some View {
        HStack(alignment: .center, spacing: 14) {
            WidgetCalendarLeaf(dateISO: next.dateISO, size: 60)
            VStack(alignment: .leading, spacing: 6) {
                Text(next.title).font(.system(size: 17, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(2)
                WidgetAccentPill(text: WidgetFormatters.daysLabel(next.daysLeft))
            }
            Spacer(minLength: 0)
        }
    }

    private func medium(_ next: WidgetReminderItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "Важные даты", icon: "calendar")
            event(next)
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Открыть важные даты")
        }.widgetCardBackground()
    }

    private func large(_ next: WidgetReminderItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "Важные даты", icon: "calendar")
            event(next).widgetSectionCard()
            ForEach(Array(entry.snapshot.reminders.dropFirst().prefix(3).enumerated()), id: \.offset) { _, reminder in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(reminder.title).font(.system(size: 13, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(1)
                        Text(WidgetFormatters.shortDate(reminder.dateISO)).font(.system(size: 11)).foregroundStyle(palette.textSecondary)
                    }
                    Spacer(minLength: 0)
                    WidgetAccentPill(text: WidgetFormatters.daysLabel(reminder.daysLeft))
                }
            }
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Все события в календаре", filled: true)
        }.widgetCardBackground()
    }
}

struct ReminderWidget: Widget {
    let kind = "ReminderWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            ReminderEntryView(entry: entry).widgetHomeScreenContainer()
        }
        .configurationDisplayName("Важные даты")
        .description("Ближайшее событие и календарь моментов, которые хочется сохранить.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryInline, .accessoryCircular])
        .contentMarginsDisabled()
        .containerBackgroundRemovable(true)
    }
}
