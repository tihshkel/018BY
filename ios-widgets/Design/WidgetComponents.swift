import SwiftUI
import WidgetKit

// Mirrors constants/design-tokens.ts: System type, white cards, rose accents.
enum WidgetColors {
    static let primary = Color(red: 241 / 255, green: 148 / 255, blue: 162 / 255)
    static let primaryLight = Color(red: 245 / 255, green: 168 / 255, blue: 179 / 255)
    static let primaryDeep = Color(red: 180 / 255, green: 83 / 255, blue: 103 / 255)
    static let primarySurface = Color(red: 253 / 255, green: 240 / 255, blue: 242 / 255)
    static let primarySurfaceStrong = Color(red: 249 / 255, green: 224 / 255, blue: 229 / 255)
}

struct WidgetPalette {
    let textPrimary: Color
    let textSecondary: Color
    let surface: Color
    let surfaceElevated: Color
    let border: Color
    let track: Color
    let accentSurface: Color
    let accentText: Color

    static func make(colorScheme: ColorScheme) -> WidgetPalette {
        if colorScheme == .dark {
            return WidgetPalette(
                textPrimary: Color(red: 0.96, green: 0.94, blue: 0.95), textSecondary: Color(red: 0.73, green: 0.70, blue: 0.72),
                surface: Color.white.opacity(0.055), surfaceElevated: Color.white.opacity(0.08), border: Color.white.opacity(0.10),
                track: Color.white.opacity(0.12), accentSurface: WidgetColors.primary.opacity(0.14), accentText: WidgetColors.primaryLight
            )
        }
        return WidgetPalette(
            textPrimary: Color(red: 61 / 255, green: 61 / 255, blue: 61 / 255),
            textSecondary: Color(red: 138 / 255, green: 138 / 255, blue: 138 / 255),
            surface: Color(red: 250 / 255, green: 250 / 255, blue: 250 / 255), surfaceElevated: .white,
            border: Color(red: 229 / 255, green: 229 / 255, blue: 229 / 255),
            track: WidgetColors.primary.opacity(0.18), accentSurface: WidgetColors.primarySurface, accentText: WidgetColors.primaryDeep
        )
    }
}

private struct WidgetPaletteKey: EnvironmentKey {
    static let defaultValue = WidgetPalette.make(colorScheme: .light)
}

extension EnvironmentValues {
    var widgetPalette: WidgetPalette {
        get { self[WidgetPaletteKey.self] }
        set { self[WidgetPaletteKey.self] = newValue }
    }
}

enum WidgetBackgroundStyle {
    @ViewBuilder static func canvas(colorScheme: ColorScheme) -> some View {
        // A softly lit sheet of paper, also readable in the system's tinted appearance.
        LinearGradient(
            colors: colorScheme == .dark
                ? [Color(red: 0.17, green: 0.16, blue: 0.18), Color(red: 0.095, green: 0.10, blue: 0.115)]
                : [Color(red: 1, green: 0.995, blue: 0.98), Color(red: 0.97, green: 0.965, blue: 0.95)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
    }
}

private struct WidgetHomeScreenContainerModifier: ViewModifier {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme

    private var isHomeScreen: Bool {
        switch family {
        case .systemSmall, .systemMedium, .systemLarge, .systemExtraLarge: return true
        default: return false
        }
    }

    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content
                .environment(\.widgetPalette, WidgetPalette.make(colorScheme: colorScheme))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .containerBackground(for: .widget) {
                    if isHomeScreen { WidgetBackgroundStyle.canvas(colorScheme: colorScheme) }
                }
        } else {
            content
                .environment(\.widgetPalette, WidgetPalette.make(colorScheme: colorScheme))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .background {
                    if isHomeScreen { WidgetBackgroundStyle.canvas(colorScheme: colorScheme) }
                }
        }
    }
}

extension View {
    func widgetHomeScreenContainer() -> some View { modifier(WidgetHomeScreenContainerModifier()) }
    func widgetCardBackground() -> some View { modifier(WidgetContentPaddingModifier()) }
    func widgetSectionCard(padding: CGFloat = 12) -> some View { modifier(WidgetSectionCardModifier(padding: padding)) }
}

private struct WidgetContentPaddingModifier: ViewModifier {
    @Environment(\.widgetFamily) private var family
    func body(content: Content) -> some View { content.padding(family == .systemSmall ? 14 : 16) }
}

private struct WidgetSectionCardModifier: ViewModifier {
    @Environment(\.widgetPalette) private var palette
    let padding: CGFloat
    func body(content: Content) -> some View {
        content.padding(padding).background(palette.surfaceElevated)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(palette.border.opacity(0.65), lineWidth: 0.5))
    }
}

struct WidgetBrandMark: View {
    @Environment(\.widgetPalette) private var palette
    var compact = false
    var body: some View {
        Text("018BY").font(.system(size: compact ? 9 : 10, weight: .semibold))
            .tracking(0.8).foregroundStyle(palette.textSecondary)
    }
}

struct WidgetHeader: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let title: String
    let icon: String
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 10, weight: .medium)).foregroundStyle(palette.textSecondary)
            Text(title).font(.system(size: 11, weight: .medium)).foregroundStyle(palette.textSecondary)
                .lineLimit(1).minimumScaleFactor(0.85).layoutPriority(1)
            Spacer(minLength: 0)
            if family != .systemSmall { WidgetBrandMark(compact: true).fixedSize() }
        }
    }
}

struct WidgetAccentPill: View {
    @Environment(\.widgetPalette) private var palette
    let text: String
    var body: some View {
        Text(text).font(.system(size: 10, weight: .semibold)).foregroundStyle(palette.accentText)
            .lineLimit(1).padding(.horizontal, 8).padding(.vertical, 4)
            .background(palette.accentSurface).clipShape(Capsule())
    }
}

/// Neutral paper buttons keep the accent in the small arrow, not a full-width stripe.
struct WidgetCallToAction: View {
    @Environment(\.widgetPalette) private var palette
    let title: String
    var filled = false
    var body: some View {
        HStack(spacing: 6) {
            Text(title).font(.system(size: 12, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.8)
            Spacer(minLength: 4)
            Image(systemName: "arrow.up.right").font(.system(size: 8, weight: .semibold))
                .foregroundStyle(palette.accentText)
                .frame(width: 16, height: 16)
                .background(palette.accentSurface).clipShape(Circle())
        }
        .foregroundStyle(palette.textPrimary)
        .padding(.horizontal, filled ? 12 : 0).padding(.vertical, filled ? 8 : 0)
        .background { if filled { RoundedRectangle(cornerRadius: 12, style: .continuous).fill(palette.surfaceElevated) } }
        .overlay { if filled { RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(palette.border.opacity(0.7), lineWidth: 0.5) } }
    }
}

struct WidgetAlbumTheme {
    let accent: Color
    let surface: Color
    let symbol: String

    static func make(category: String, colorScheme: ColorScheme) -> WidgetAlbumTheme {
        let dark = colorScheme == .dark
        let accent: Color
        let symbol: String
        switch category {
        case "kids":
            accent = dark ? Color(red: 0.91, green: 0.74, blue: 0.53) : Color(red: 0.66, green: 0.43, blue: 0.22)
            symbol = "teddybear"
        case "pregnancy":
            accent = dark ? Color(red: 0.77, green: 0.71, blue: 0.92) : Color(red: 0.52, green: 0.43, blue: 0.68)
            symbol = "moon.stars"
        case "family":
            accent = dark ? Color(red: 0.67, green: 0.81, blue: 0.70) : Color(red: 0.36, green: 0.53, blue: 0.40)
            symbol = "house"
        case "diary":
            accent = dark ? Color(red: 0.66, green: 0.79, blue: 0.90) : Color(red: 0.36, green: 0.51, blue: 0.65)
            symbol = "leaf"
        case "holidays", "travel":
            accent = dark ? Color(red: 0.90, green: 0.74, blue: 0.55) : Color(red: 0.65, green: 0.46, blue: 0.27)
            symbol = "sparkles"
        default:
            accent = dark ? WidgetColors.primaryLight : WidgetColors.primaryDeep
            symbol = "heart"
        }
        return WidgetAlbumTheme(accent: accent, surface: accent.opacity(dark ? 0.13 : 0.09), symbol: symbol)
    }
}

/// Layered miniature covers: individual themes, no decorative spine stripe.
struct WidgetAlbumGlyph: View {
    @Environment(\.widgetPalette) private var palette
    @Environment(\.colorScheme) private var colorScheme
    var icon = "heart"
    var size: CGFloat = 48
    var category = ""
    private var theme: WidgetAlbumTheme { .make(category: category, colorScheme: colorScheme) }
    private var symbol: String { icon == "heart" ? theme.symbol : icon }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.12, style: .continuous)
                .fill(theme.surface).rotationEffect(.degrees(9)).offset(x: 3, y: 2)
            RoundedRectangle(cornerRadius: size * 0.12, style: .continuous)
                .fill(palette.surfaceElevated)
                .overlay(RoundedRectangle(cornerRadius: size * 0.12, style: .continuous).strokeBorder(palette.border, lineWidth: 0.5))
                .rotationEffect(.degrees(-6)).offset(x: -1, y: 1)
            RoundedRectangle(cornerRadius: size * 0.12, style: .continuous)
                .fill(LinearGradient(colors: [palette.surfaceElevated, theme.surface], startPoint: .topLeading, endPoint: .bottomTrailing))
                .overlay(RoundedRectangle(cornerRadius: size * 0.12, style: .continuous).strokeBorder(theme.accent.opacity(0.22), lineWidth: 0.6))
            Circle().fill(theme.surface).frame(width: size * 0.55, height: size * 0.55)
            Image(systemName: symbol).font(.system(size: size * 0.30, weight: .light)).foregroundStyle(theme.accent)
            Image(systemName: "sparkle").font(.system(size: size * 0.13, weight: .light)).foregroundStyle(theme.accent.opacity(0.6))
                .offset(x: size * 0.21, y: -size * 0.28)
        }
        .frame(width: size * 0.78, height: size)
        .accessibilityHidden(true)
    }
}

/// A keepsake stamp for daily notes and letters; native vector artwork at every size.
struct WidgetKeepsakeStamp: View {
    @Environment(\.colorScheme) private var colorScheme
    var symbol = "sparkles"
    var category = ""
    var size: CGFloat = 52
    private var theme: WidgetAlbumTheme { .make(category: category, colorScheme: colorScheme) }
    var body: some View {
        ZStack {
            Circle().fill(theme.surface)
            Circle().strokeBorder(theme.accent.opacity(0.35), style: StrokeStyle(lineWidth: 1, dash: [1, 3])).padding(4)
            Image(systemName: symbol).font(.system(size: size * 0.36, weight: .light)).foregroundStyle(theme.accent)
            Image(systemName: "sparkle").font(.system(size: size * 0.15, weight: .light)).foregroundStyle(theme.accent.opacity(0.65))
                .offset(x: size * 0.35, y: -size * 0.32)
        }.frame(width: size, height: size).accessibilityHidden(true)
    }
}

struct WidgetCalendarLeaf: View {
    @Environment(\.widgetPalette) private var palette
    let dateISO: String
    var size: CGFloat = 60
    private var date: Date? { WidgetFormatters.parseDate(dateISO) }
    private var month: String {
        guard let date else { return "Дата" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "LLL"
        return formatter.string(from: date).replacingOccurrences(of: ".", with: "").uppercased()
    }
    var body: some View {
        VStack(spacing: 1) {
            HStack(spacing: size * 0.3) {
                Circle().fill(palette.border).frame(width: 3, height: 3)
                Circle().fill(palette.border).frame(width: 3, height: 3)
            }.padding(.top, size < 50 ? 4 : 6)
            Text(month).font(.system(size: max(8, size * 0.13), weight: .semibold)).tracking(1).foregroundStyle(palette.textSecondary)
            Text(date.map { "\(Calendar.current.component(.day, from: $0))" } ?? "—")
                .font(.system(size: size * 0.43, weight: .medium, design: .serif)).foregroundStyle(palette.textPrimary)
        }
        .frame(width: size * 0.9, height: size)
        .background(palette.surfaceElevated)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(palette.border, lineWidth: 0.6))
        .rotationEffect(.degrees(-4))
        .accessibilityLabel(WidgetFormatters.shortDate(dateISO))
    }
}

struct WidgetTrimesterTrail: View {
    @Environment(\.widgetPalette) private var palette
    @Environment(\.colorScheme) private var colorScheme
    let current: Int
    private var theme: WidgetAlbumTheme { .make(category: "pregnancy", colorScheme: colorScheme) }
    var body: some View {
        HStack(spacing: 12) {
            ForEach(1...3, id: \.self) { value in
                HStack(spacing: 4) {
                    Image(systemName: value < current ? "checkmark.circle.fill" : value == current ? "circle.inset.filled" : "circle")
                        .font(.system(size: 10)).foregroundStyle(value <= current ? theme.accent : palette.textSecondary.opacity(0.5))
                    Text("\(value) триместр").font(.system(size: 9, weight: value == current ? .semibold : .regular))
                        .foregroundStyle(value == current ? palette.textPrimary : palette.textSecondary)
                }
            }
        }.accessibilityElement(children: .ignore).accessibilityLabel("\(current)-й триместр")
    }
}

struct WidgetMetricLabel: View {
    @Environment(\.widgetPalette) private var palette
    let text: String
    var body: some View {
        Text(text).font(.system(size: 11, weight: .medium)).foregroundStyle(palette.textSecondary).lineLimit(1)
    }
}

struct WidgetHeroNumber: View {
    @Environment(\.widgetPalette) private var palette
    let text: String
    var size: CGFloat = 34
    var body: some View {
        Text(text).font(.system(size: size, weight: .bold, design: .rounded))
            .foregroundStyle(palette.textPrimary).minimumScaleFactor(0.6).lineLimit(1).monospacedDigit()
    }
}

struct WidgetProgressRing: View {
    @Environment(\.widgetPalette) private var palette
    @Environment(\.colorScheme) private var colorScheme
    let percent: Int
    var lineWidth: CGFloat = 5
    var size: CGFloat = 44
    var category = ""
    private var value: Int { min(100, max(0, percent)) }
    private var theme: WidgetAlbumTheme { .make(category: value == 100 ? "family" : category, colorScheme: colorScheme) }
    var body: some View {
        ZStack {
            Circle().stroke(palette.border.opacity(0.65), lineWidth: lineWidth)
            Circle().trim(from: 0, to: CGFloat(value) / 100)
                .stroke(theme.accent, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)).rotationEffect(.degrees(-90))
            Text("\(value)%").font(.system(size: max(8, size * 0.22), weight: .medium))
                .foregroundStyle(palette.textPrimary).monospacedDigit()
        }.frame(width: size, height: size)
        .accessibilityElement(children: .ignore).accessibilityLabel("Заполнено на \(value) процентов")
    }
}

struct WidgetEmptyState: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetPalette) private var palette
    let title: String
    let subtitle: String
    var action = "Открыть приложение"
    var icon = "book.closed"

    @ViewBuilder var body: some View {
        switch family {
        case .accessoryInline:
            Label(title, systemImage: icon)
        case .accessoryCircular:
            ZStack { AccessoryWidgetBackground(); Image(systemName: icon) }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                Text(subtitle).font(.system(size: 11)).lineLimit(2)
            }
        default:
            VStack(alignment: .leading, spacing: 6) {
                WidgetHeader(title: "Ваша история", icon: icon)
                Spacer(minLength: 0)
                Text(title).font(.system(size: 17, weight: .medium, design: .serif)).foregroundStyle(palette.textPrimary)
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true).minimumScaleFactor(0.85).layoutPriority(1)
                Text(subtitle).font(.system(size: 12)).foregroundStyle(palette.textSecondary).lineLimit(family == .systemSmall ? 2 : 3)
                Spacer(minLength: 0)
                WidgetCallToAction(title: action)
            }
            .background(alignment: .trailing) {
                WidgetKeepsakeStamp(symbol: icon, size: 72).opacity(0.07).padding(.trailing, 2)
            }
            .widgetCardBackground()
        }
    }
}

struct WidgetProjectRow: View {
    @Environment(\.widgetPalette) private var palette
    let project: WidgetProjectItem
    var body: some View {
        HStack(spacing: 10) {
            WidgetAlbumGlyph(icon: project.percent >= 100 ? "checkmark" : "heart", size: 36, category: project.category)
            VStack(alignment: .leading, spacing: 3) {
                Text(project.title).font(.system(size: 12, weight: .semibold)).foregroundStyle(palette.textPrimary)
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true).layoutPriority(1)
                Text(detail).font(.system(size: 10)).foregroundStyle(palette.textSecondary).lineLimit(1)
            }
            Spacer(minLength: 0)
            if project.progressKnown != false { WidgetProgressRing(percent: project.percent, lineWidth: 2.5, size: 30, category: project.category) }
            Image(systemName: "chevron.right").font(.system(size: 9, weight: .semibold)).foregroundStyle(palette.textSecondary)
        }
    }
    private var detail: String {
        if project.progressKnown == false { return "Начните с первой страницы" }
        if let remaining = project.unfinishedPages, remaining > 0 { return WidgetFormatters.remainingPages(remaining) }
        return project.percent >= 100 ? "История сохранена" : project.categoryLabel
    }
}

struct WidgetSnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry { WidgetDataStore.previewEntry() }
    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        completion(context.isPreview ? WidgetDataStore.previewEntry() : WidgetDataStore.makeEntry())
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) { completion(WidgetDataStore.makeTimeline()) }
}
