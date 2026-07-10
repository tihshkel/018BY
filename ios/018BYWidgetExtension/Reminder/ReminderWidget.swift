import SwiftUI
import WidgetKit

struct ReminderEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    private var reminders: [WidgetReminderItem] {
        entry.snapshot.reminders
    }

    var body: some View {
        Group {
            if let next = entry.snapshot.nextReminder {
                content(next)
            } else {
                WidgetEmptyState(
                    title: "Напоминаний нет",
                    subtitle: "Добавьте важные даты в приложении"
                )
                .widgetURL(WidgetDeepLinks.reminders)
            }
        }
    }

    @ViewBuilder
    private func content(_ next: WidgetReminderItem) -> some View {
        switch family {
        case .systemSmall:
            smallView(next)
        case .systemMedium:
            mediumView(next)
        case .systemLarge:
            largeView
        case .accessoryInline:
            Text("018BY · \(WidgetFormatters.daysLabel(next.daysLeft))")
                .font(.system(size: 12, weight: .semibold))
                .widgetURL(WidgetDeepLinks.reminders)
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text("\(max(next.daysLeft, 0))")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                    Text("дн")
                        .font(.system(size: 8, weight: .medium))
                }
            }
            .widgetURL(WidgetDeepLinks.reminders)
        default:
            smallView(next)
        }
    }

    private func smallView(_ next: WidgetReminderItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetBrandMark(compact: true)
            Text(WidgetFormatters.daysLabel(next.daysLeft))
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.primaryDeep)
            Text(next.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.textPrimary)
                .lineLimit(2)
            Text(WidgetFormatters.shortDate(next.dateISO))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(palette.textSecondary)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.reminders)
    }

    private func mediumView(_ next: WidgetReminderItem) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                WidgetAccentPill(text: "Ближайшее событие")
                Text(next.title)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(palette.textPrimary)
                    .lineLimit(2)
                Text(WidgetFormatters.shortDate(next.dateISO))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.textSecondary)
            }
            Spacer(minLength: 0)
            Text(WidgetFormatters.daysLabel(next.daysLeft))
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(WidgetColors.primaryDeep)
                .multilineTextAlignment(.trailing)
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.reminders)
    }

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Напоминания")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(palette.textPrimary)
            ForEach(Array(reminders.prefix(3).enumerated()), id: \.offset) { _, reminder in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(reminder.title)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(palette.textPrimary)
                            .lineLimit(1)
                        Text(WidgetFormatters.shortDate(reminder.dateISO))
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(palette.textSecondary)
                    }
                    Spacer()
                    Text(WidgetFormatters.daysLabel(reminder.daysLeft))
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(WidgetColors.primaryDeep)
                }
                .padding(.vertical, 4)
            }
        }
        .widgetCardBackground()
        .widgetURL(WidgetDeepLinks.reminders)
    }
}

struct ReminderWidget: Widget {
    let kind = "ReminderWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            ReminderEntryView(entry: entry)
                .widgetHomeScreenContainer()
        }
        .configurationDisplayName("Важные даты")
        .description("Ближайшие пользовательские напоминания.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryInline,
            .accessoryCircular,
        ])
        .containerBackgroundRemovable(true)
    }
}
