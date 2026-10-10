import SwiftUI
import WidgetKit

struct PregnancyEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let entry: WidgetEntry

    var body: some View {
        Group {
            if let item = entry.snapshot.pregnancy {
                content(item).widgetURL(WidgetDeepLinks.pregnancyProject(item))
            } else {
                WidgetEmptyState(title: "В ожидании встречи", subtitle: "Укажите ПДР — здесь появятся срок и подсказки для дневника.", action: "Указать дату", icon: "heart")
                    .widgetURL(WidgetDeepLinks.setPdr)
            }
        }
    }

    @ViewBuilder private func content(_ item: WidgetPregnancyItem) -> some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text("\(item.week)").font(.system(size: 20, weight: .semibold))
                    Text("неделя").font(.system(size: 8))
                }
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(WidgetFormatters.pregnancyWeekDayLabel(week: item.week, dayInWeek: item.dayInWeek)).font(.system(size: 12, weight: .semibold))
                Text(dueLabel(item)).font(.system(size: 11)).lineLimit(1)
                Text("Сохранить момент ожидания").font(.system(size: 10)).lineLimit(1)
            }
        case .systemMedium: medium(item)
        case .systemLarge: large(item)
        default: small(item)
        }
    }

    private func dueLabel(_ item: WidgetPregnancyItem) -> String {
        if item.daysLeft == 0 { return "ПДР сегодня" }
        if item.daysLeft < 0 { return "ПДР · \(WidgetFormatters.shortDate(item.pdrISO))" }
        return "До ПДР · \(WidgetFormatters.daysUntilPdrLabel(item.daysLeft))"
    }

    private func week(_ item: WidgetPregnancyItem, size: CGFloat = 40) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            WidgetHeroNumber(text: "\(item.week)", size: size)
            Text("неделя").font(.system(size: 13, weight: .medium)).foregroundStyle(palette.textPrimary)
        }
    }

    private func small(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            WidgetHeader(title: "В ожидании тебя", icon: "moon.stars")
            Spacer(minLength: 0)
            HStack {
                week(item, size: 32)
                Spacer(minLength: 0)
                WidgetKeepsakeStamp(symbol: "moon.stars", category: "pregnancy", size: 28)
            }
            Text("\(item.dayInWeek)-й день · \(item.trimester)-й триместр").font(.system(size: 10)).foregroundStyle(palette.textSecondary).lineLimit(1)
            WidgetAccentPill(text: dueLabel(item))
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Открыть дневник")
        }.widgetCardBackground()
    }

    private func medium(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: "В ожидании тебя", icon: "moon.stars")
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    week(item, size: 34)
                    Text("\(item.dayInWeek)-й день · \(item.trimester)-й триместр").font(.system(size: 11)).foregroundStyle(palette.textSecondary)
                }
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 5) {
                    WidgetAccentPill(text: dueLabel(item))
                    Text(WidgetFormatters.shortDate(item.pdrISO)).font(.system(size: 11)).foregroundStyle(palette.textSecondary)
                }
            }
            WidgetTrimesterTrail(current: item.trimester)
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Сохранить момент ожидания")
        }.widgetCardBackground()
    }

    private func large(_ item: WidgetPregnancyItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: "В ожидании тебя", icon: "moon.stars")
            HStack(spacing: 16) {
                WidgetKeepsakeStamp(symbol: "moon.stars", category: "pregnancy", size: 56)
                VStack(alignment: .leading, spacing: 3) {
                    week(item, size: 44)
                    Text("\(item.dayInWeek)-й день · \(item.trimester)-й триместр").font(.system(size: 12)).foregroundStyle(palette.textSecondary)
                }
                Spacer(minLength: 0)
            }
            HStack {
                Text(dueLabel(item)).font(.system(size: 12, weight: .medium)).foregroundStyle(palette.accentText)
                Spacer(minLength: 4)
                Text(WidgetFormatters.shortDate(item.pdrISO)).font(.system(size: 11)).foregroundStyle(palette.textSecondary)
            }
            WidgetTrimesterTrail(current: item.trimester)
            VStack(alignment: .leading, spacing: 7) {
                WidgetMetricLabel(text: "Строчка в дневник")
                Text(WidgetMemoryPrompts.text(for: entry.date, category: "pregnancy"))
                    .font(.system(size: 16, weight: .semibold)).foregroundStyle(palette.textPrimary).lineLimit(2)
                Text("Маленькая запись о большом ожидании.")
                    .font(.system(size: 12)).foregroundStyle(palette.textSecondary).lineLimit(1)
            }.frame(maxWidth: .infinity, alignment: .leading).widgetSectionCard()
            Spacer(minLength: 0)
            WidgetCallToAction(title: "Открыть «\(item.projectTitle)»", filled: true)
        }.widgetCardBackground()
    }
}

struct PregnancyWidget: Widget {
    let kind = "PregnancyWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WidgetSnapshotProvider()) { entry in
            PregnancyEntryView(entry: entry).widgetHomeScreenContainer()
        }
        .configurationDisplayName("В ожидании тебя")
        .description("Неделя беременности, дни до ПДР и повод сохранить момент в дневнике.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
        .containerBackgroundRemovable(true)
    }
}
