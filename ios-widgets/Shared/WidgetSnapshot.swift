import Foundation
import WidgetKit

struct WidgetProjectItem: Codable, Hashable {
    let id: String
    let title: String
    let category: String
    let categoryLabel: String
    let percent: Int
    let celebration: String?
    let coverType: String?
    let pagesCount: Int
    let photosCount: Int
    let unfinishedPages: Int?
    let filledPages: Int?
    let progressKnown: Bool?
    let interiorType: String?

    enum CodingKeys: String, CodingKey {
        case id, title, category, categoryLabel, percent, celebration, coverType, pagesCount, photosCount, unfinishedPages, filledPages, progressKnown, interiorType
    }

    init(
        id: String,
        title: String,
        category: String,
        categoryLabel: String,
        percent: Int,
        celebration: String?,
        coverType: String?,
        pagesCount: Int,
        photosCount: Int,
        unfinishedPages: Int?,
        filledPages: Int? = nil,
        progressKnown: Bool? = nil,
        interiorType: String? = nil
    ) {
        self.id = id
        self.title = title
        self.category = category
        self.categoryLabel = categoryLabel
        self.percent = percent
        self.celebration = celebration
        self.coverType = coverType
        self.pagesCount = pagesCount
        self.photosCount = photosCount
        self.unfinishedPages = unfinishedPages
        self.filledPages = filledPages
        self.progressKnown = progressKnown
        self.interiorType = interiorType
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decodeIfPresent(String.self, forKey: .title) ?? "Альбом"
        category = try container.decodeIfPresent(String.self, forKey: .category) ?? ""
        categoryLabel = try container.decodeIfPresent(String.self, forKey: .categoryLabel) ?? category
        percent = try container.decodeIfPresent(Int.self, forKey: .percent) ?? 0
        celebration = try container.decodeIfPresent(String.self, forKey: .celebration)
        coverType = try container.decodeIfPresent(String.self, forKey: .coverType)
        pagesCount = try container.decodeIfPresent(Int.self, forKey: .pagesCount) ?? 0
        photosCount = try container.decodeIfPresent(Int.self, forKey: .photosCount) ?? 0
        unfinishedPages = try container.decodeIfPresent(Int.self, forKey: .unfinishedPages)
        filledPages = try container.decodeIfPresent(Int.self, forKey: .filledPages)
        progressKnown = try container.decodeIfPresent(Bool.self, forKey: .progressKnown)
        interiorType = try container.decodeIfPresent(String.self, forKey: .interiorType)
    }
}

struct WidgetContinueItem: Codable, Hashable {
    let projectId: String
    let instanceId: String
    let projectTitle: String
    let pageTitle: String
    let percent: Int
    let celebration: String?
    let coverType: String?
    let interiorType: String?
    let editorPath: String?
    let unfinishedPages: Int?
    let filledPages: Int?
    let totalPages: Int?
    let actionHint: String?

    enum CodingKeys: String, CodingKey {
        case projectId, instanceId, projectTitle, pageTitle, percent, celebration, coverType, interiorType, editorPath, unfinishedPages, filledPages, totalPages, actionHint
    }

    init(
        projectId: String,
        instanceId: String,
        projectTitle: String,
        pageTitle: String,
        percent: Int,
        celebration: String?,
        coverType: String?,
        interiorType: String? = nil,
        editorPath: String? = nil,
        unfinishedPages: Int? = nil,
        filledPages: Int? = nil,
        totalPages: Int? = nil,
        actionHint: String? = nil
    ) {
        self.projectId = projectId
        self.instanceId = instanceId
        self.projectTitle = projectTitle
        self.pageTitle = pageTitle
        self.percent = percent
        self.celebration = celebration
        self.coverType = coverType
        self.interiorType = interiorType
        self.editorPath = editorPath
        self.unfinishedPages = unfinishedPages
        self.filledPages = filledPages
        self.totalPages = totalPages
        self.actionHint = actionHint
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        projectId = try container.decode(String.self, forKey: .projectId)
        instanceId = try container.decodeIfPresent(String.self, forKey: .instanceId) ?? ""
        projectTitle = try container.decodeIfPresent(String.self, forKey: .projectTitle) ?? "Альбом"
        pageTitle = try container.decodeIfPresent(String.self, forKey: .pageTitle) ?? "Продолжить"
        percent = try container.decodeIfPresent(Int.self, forKey: .percent) ?? 0
        celebration = try container.decodeIfPresent(String.self, forKey: .celebration)
        coverType = try container.decodeIfPresent(String.self, forKey: .coverType)
        interiorType = try container.decodeIfPresent(String.self, forKey: .interiorType)
        editorPath = try container.decodeIfPresent(String.self, forKey: .editorPath)
        unfinishedPages = try container.decodeIfPresent(Int.self, forKey: .unfinishedPages)
        filledPages = try container.decodeIfPresent(Int.self, forKey: .filledPages)
        totalPages = try container.decodeIfPresent(Int.self, forKey: .totalPages)
        actionHint = try container.decodeIfPresent(String.self, forKey: .actionHint)
    }
}

struct WidgetReminderItem: Codable, Hashable {
    let title: String
    let dateISO: String
    let daysLeft: Int
}

struct WidgetPregnancyItem: Codable, Hashable {
    let week: Int
    let day: Int
    let dayInWeek: Int
    let trimester: Int
    let weeklyInsight: String?
    let daysLeft: Int
    let pdrISO: String
    let projectTitle: String
    let projectId: String

    enum CodingKeys: String, CodingKey {
        case week, day, dayInWeek, trimester, weeklyInsight, daysLeft, pdrISO, projectTitle, projectId
    }

    init(
        week: Int,
        day: Int,
        dayInWeek: Int,
        trimester: Int,
        weeklyInsight: String?,
        daysLeft: Int,
        pdrISO: String,
        projectTitle: String,
        projectId: String
    ) {
        self.week = week
        self.day = day
        self.dayInWeek = dayInWeek
        self.trimester = trimester
        self.weeklyInsight = weeklyInsight
        self.daysLeft = daysLeft
        self.pdrISO = pdrISO
        self.projectTitle = projectTitle
        self.projectId = projectId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        week = try container.decodeIfPresent(Int.self, forKey: .week) ?? 1
        day = try container.decodeIfPresent(Int.self, forKey: .day) ?? max(1, week * 7)
        dayInWeek = try container.decodeIfPresent(Int.self, forKey: .dayInWeek) ?? max(1, ((day - 1) % 7) + 1)
        trimester = try container.decodeIfPresent(Int.self, forKey: .trimester) ?? (week <= 13 ? 1 : week <= 27 ? 2 : 3)
        weeklyInsight = try container.decodeIfPresent(String.self, forKey: .weeklyInsight)
        daysLeft = try container.decodeIfPresent(Int.self, forKey: .daysLeft) ?? 0
        pdrISO = try container.decodeIfPresent(String.self, forKey: .pdrISO) ?? ""
        projectTitle = try container.decodeIfPresent(String.self, forKey: .projectTitle) ?? "Беременность"
        projectId = try container.decodeIfPresent(String.self, forKey: .projectId) ?? ""
    }
}

struct WidgetInboxNotificationItem: Codable, Hashable {
    let id: String
    let title: String
    let body: String
    let receivedAt: String
}

struct WidgetSnapshot: Codable {
    let updatedAt: String
    let userName: String?
    let albumsCount: Int
    let projects: [WidgetProjectItem]
    let continueProject: WidgetContinueItem?
    let nextReminder: WidgetReminderItem?
    let reminders: [WidgetReminderItem]
    let pregnancy: WidgetPregnancyItem?
    let todayNotifications: [WidgetInboxNotificationItem]
    let latestNotification: WidgetInboxNotificationItem?
    let unreadTodayCount: Int

    enum CodingKeys: String, CodingKey {
        case updatedAt, userName, albumsCount, projects, continueProject, nextReminder, reminders, pregnancy
        case todayNotifications, latestNotification, unreadTodayCount
    }

    init(
        updatedAt: String,
        userName: String?,
        albumsCount: Int,
        projects: [WidgetProjectItem],
        continueProject: WidgetContinueItem?,
        nextReminder: WidgetReminderItem?,
        reminders: [WidgetReminderItem],
        pregnancy: WidgetPregnancyItem?,
        todayNotifications: [WidgetInboxNotificationItem],
        latestNotification: WidgetInboxNotificationItem?,
        unreadTodayCount: Int
    ) {
        self.updatedAt = updatedAt
        self.userName = userName
        self.albumsCount = albumsCount
        self.projects = projects
        self.continueProject = continueProject
        self.nextReminder = nextReminder
        self.reminders = reminders
        self.pregnancy = pregnancy
        self.todayNotifications = todayNotifications
        self.latestNotification = latestNotification
        self.unreadTodayCount = unreadTodayCount
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
            ?? ISO8601DateFormatter().string(from: Date())
        userName = try container.decodeIfPresent(String.self, forKey: .userName)
        projects = try container.decodeIfPresent([WidgetProjectItem].self, forKey: .projects) ?? []
        albumsCount = try container.decodeIfPresent(Int.self, forKey: .albumsCount) ?? projects.count
        continueProject = try container.decodeIfPresent(WidgetContinueItem.self, forKey: .continueProject)
        nextReminder = try container.decodeIfPresent(WidgetReminderItem.self, forKey: .nextReminder)
        reminders = try container.decodeIfPresent([WidgetReminderItem].self, forKey: .reminders) ?? []
        pregnancy = try container.decodeIfPresent(WidgetPregnancyItem.self, forKey: .pregnancy)
        todayNotifications = try container.decodeIfPresent([WidgetInboxNotificationItem].self, forKey: .todayNotifications) ?? []
        latestNotification = try container.decodeIfPresent(WidgetInboxNotificationItem.self, forKey: .latestNotification)
        unreadTodayCount = try container.decodeIfPresent(Int.self, forKey: .unreadTodayCount) ?? 0
    }
}

struct WidgetEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

enum WidgetDataStore {
    static let suiteName = "group.com.tihshkel.x018BY.expowidgets"
    static let dataKey = "WidgetSnapshot"

    static func loadSnapshot() -> WidgetSnapshot {
        guard
            let suite = UserDefaults(suiteName: suiteName),
            let json = suite.string(forKey: dataKey),
            let data = json.data(using: .utf8),
            let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else {
            return emptySnapshot()
        }
        return snapshot
    }

    static func emptySnapshot() -> WidgetSnapshot {
        WidgetSnapshot(
            updatedAt: ISO8601DateFormatter().string(from: Date()),
            userName: nil,
            albumsCount: 0,
            projects: [],
            continueProject: nil,
            nextReminder: nil,
            reminders: [],
            pregnancy: nil,
            todayNotifications: [],
            latestNotification: nil,
            unreadTodayCount: 0
        )
    }

    /// Recalculate calendar-dependent content from dates, not from the last app launch.
    static func snapshot(_ source: WidgetSnapshot, at date: Date) -> WidgetSnapshot {
        let calendar = Calendar.current
        let reminders = (source.reminders.isEmpty ? source.nextReminder.map { [$0] } ?? [] : source.reminders)
            .compactMap { item -> WidgetReminderItem? in
                guard let target = WidgetFormatters.parseDate(item.dateISO) else { return nil }
                let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: target)).day ?? 0
                guard days >= 0 else { return nil }
                return WidgetReminderItem(title: item.title, dateISO: item.dateISO, daysLeft: days)
            }
            .sorted { (WidgetFormatters.parseDate($0.dateISO) ?? .distantFuture) < (WidgetFormatters.parseDate($1.dateISO) ?? .distantFuture) }
        var pregnancy: WidgetPregnancyItem?
        if let item = source.pregnancy, let due = WidgetFormatters.parseDate(item.pdrISO) {
            let daysLeft = calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: due)).day ?? 0
            if daysLeft >= -14 {
                let day = min(294, max(1, 281 - daysLeft))
                let week = min(42, max(1, 40 - Int(floor(Double(daysLeft) / 7))))
                pregnancy = WidgetPregnancyItem(
                    week: week, day: day, dayInWeek: ((day - 1) % 7) + 1,
                    trimester: week <= 13 ? 1 : week <= 27 ? 2 : 3,
                    weeklyInsight: week == item.week ? item.weeklyInsight : nil,
                    daysLeft: daysLeft, pdrISO: item.pdrISO,
                    projectTitle: item.projectTitle, projectId: item.projectId
                )
            }
        }
        let today = source.todayNotifications.filter {
            guard let received = WidgetFormatters.parseDate($0.receivedAt) else { return false }
            return calendar.isDate(received, inSameDayAs: date)
        }
        let sameSnapshotDay = WidgetFormatters.parseDate(source.updatedAt).map { calendar.isDate($0, inSameDayAs: date) } ?? false
        return WidgetSnapshot(
            updatedAt: source.updatedAt, userName: source.userName, albumsCount: source.albumsCount,
            projects: source.projects, continueProject: source.continueProject,
            nextReminder: reminders.first, reminders: reminders, pregnancy: pregnancy,
            todayNotifications: today, latestNotification: source.latestNotification,
            unreadTodayCount: sameSnapshotDay ? source.unreadTodayCount : today.count
        )
    }

    static func makeEntry(at date: Date = Date()) -> WidgetEntry {
        WidgetEntry(date: date, snapshot: snapshot(loadSnapshot(), at: date))
    }

    static func makeTimeline() -> Timeline<WidgetEntry> {
        let now = Date()
        let source = loadSnapshot()
        var dates = [now]
        // Future midnight entries update dates and prompts even if iOS delays a reload.
        for offset in 1...7 {
            if let day = Calendar.current.date(byAdding: .day, value: offset, to: Calendar.current.startOfDay(for: now)) {
                dates.append(day)
            }
        }
        let entries = dates.map { WidgetEntry(date: $0, snapshot: snapshot(source, at: $0)) }
        return Timeline(entries: entries, policy: .after(now.addingTimeInterval(3600)))
    }

    static func previewEntry() -> WidgetEntry {
        let now = Date()
        let iso = ISO8601DateFormatter().string(from: now)
        let project = WidgetProjectItem(
            id: "preview", title: "Наша маленькая история", category: "kids", categoryLabel: "Детский альбом",
            percent: 64, celebration: "kids", coverType: nil, pagesCount: 28, photosCount: 36,
            unfinishedPages: 10, filledPages: 18, progressKnown: true
        )
        let second = WidgetProjectItem(
            id: "preview-pregnancy", title: "В ожидании тебя", category: "pregnancy", categoryLabel: "Дневник беременности",
            percent: 35, celebration: "pregnancy", coverType: nil, pagesCount: 40, photosCount: 12,
            unfinishedPages: 26, filledPages: 14, progressKnown: true
        )
        let third = WidgetProjectItem(
            id: "preview-family", title: "Наши семейные моменты", category: "family", categoryLabel: "Семейный альбом",
            percent: 100, celebration: "family", coverType: nil, pagesCount: 20, photosCount: 42,
            unfinishedPages: 0, filledPages: 20, progressKnown: true
        )
        let next = WidgetContinueItem(
            projectId: project.id, instanceId: "preview-page", projectTitle: project.title,
            pageTitle: "Первая улыбка", percent: 64, celebration: "kids", coverType: nil,
            unfinishedPages: 10, filledPages: 18, totalPages: 28,
            actionHint: "Добавьте фото и несколько слов об этом моменте"
        )
        let reminderDate = Calendar.current.date(byAdding: .day, value: 3, to: now) ?? now
        let reminder = WidgetReminderItem(title: "Сохранить моменты месяца", dateISO: ISO8601DateFormatter().string(from: reminderDate), daysLeft: 3)
        let due = Calendar.current.date(byAdding: .day, value: 108, to: now) ?? now
        let pregnancy = WidgetPregnancyItem(week: 25, day: 173, dayInWeek: 5, trimester: 2, weeklyInsight: nil, daysLeft: 108, pdrISO: ISO8601DateFormatter().string(from: due), projectTitle: "В ожидании тебя", projectId: "preview-pregnancy")
        let notification = WidgetInboxNotificationItem(id: "preview-note", title: "У каждого момента есть история", body: "Выберите любимое фото и сохраните то, что осталось за кадром.", receivedAt: iso)
        return WidgetEntry(date: now, snapshot: WidgetSnapshot(
            updatedAt: iso, userName: "Анна", albumsCount: 3, projects: [project, second, third], continueProject: next,
            nextReminder: reminder, reminders: [reminder], pregnancy: pregnancy,
            todayNotifications: [notification], latestNotification: notification, unreadTodayCount: 1
        ))
    }
}

enum WidgetDeepLinks {
    static let createAlbum = URL(string: "app018by://my-stories")!
    static let stories = URL(string: "app018by://all-stories")!
    static let reminders = URL(string: "app018by://reminders-list")!
    static let notifications = URL(string: "app018by://notifications")!
    static let setPdr = URL(string: "app018by://paper-album-notifications")!
    static let home = URL(string: "app018by://")!

    private static func projectURL(id: String, mode: String) -> URL {
        guard !id.isEmpty else { return stories }
        var components = URLComponents(string: "app018by://widget-open")!
        components.queryItems = [URLQueryItem(name: "id", value: id), URLQueryItem(name: "mode", value: mode)]
        return components.url ?? stories
    }

    static func albumPages(project: WidgetProjectItem) -> URL { projectURL(id: project.id, mode: "album") }
    static func continueProject(_ item: WidgetContinueItem) -> URL { projectURL(id: item.projectId, mode: "continue") }
    static func pregnancyProject(_ item: WidgetPregnancyItem) -> URL { projectURL(id: item.projectId, mode: "album") }
}

/// Stable daily rotation, using calendar components rather than randomized Swift hashes.
enum WidgetMemoryPrompts {
    static func text(for date: Date, category: String = "") -> String {
        let general = ["Какой момент хочется запомнить?", "Что осталось за кадром любимого фото?", "Какая маленькая деталь сделала день особенным?", "Кого хочется увидеть на страницах альбома?", "Какие слова хочется сохранить на память?", "Какое фото сегодня вызывает улыбку?"]
        let prompts: [String]
        switch category {
        case "kids": prompts = ["Что нового получилось у малыша?", "Какая улыбка сегодня была самой тёплой?", "Какие смешные слова хочется запомнить?", "Какой маленький шаг стал большим событием?", "Что малыш любит больше всего сейчас?", "Как прошёл ваш день вместе?"]
        case "pregnancy": prompts = ["Каким было ваше настроение сегодня?", "Что хочется рассказать малышу?", "Какой момент ожидания хочется сохранить?", "Что сегодня подарило вам улыбку?", "О чём вы мечтаете для вашей первой встречи?", "Какие слова поддержки хочется запомнить?"]
        case "family": prompts = ["Какую семейную историю хочется сохранить?", "Какая традиция делает вас ближе?", "Какое общее фото вызывает улыбку?", "За что хочется поблагодарить близких?", "Как вы провели время вместе?", "Какой семейный момент хочется повторить?"]
        case "holidays": prompts = ["Что стало самым тёплым моментом праздника?", "Какие слова хочется оставить на память?", "Какое фото передаёт настроение этого дня?", "Кто сделал этот день особенным?", "Какую деталь праздника хочется запомнить?", "Какая история скрывается за вашим фото?"]
        default: prompts = general
        }
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        let seed = (parts.year ?? 0) * 372 + (parts.month ?? 0) * 31 + (parts.day ?? 0)
        return prompts[abs(seed) % prompts.count]
    }
}

enum WidgetFormatters {
    static func daysLabel(_ days: Int) -> String {
        if days == 0 { return "Сегодня" }
        if days == 1 { return "Завтра" }
        return "Через \(days) дн."
    }

    static func daysUntilPdrLabel(_ days: Int) -> String {
        let value = max(days, 0)
        return "\(value) \(dayUnit(value))"
    }

    static func albumsCountLabel(_ count: Int) -> String {
        "\(count) \(albumUnit(count))"
    }

    private static func dayUnit(_ value: Int) -> String {
        let mod10 = value % 10
        let mod100 = value % 100
        if mod10 == 1 && mod100 != 11 { return "день" }
        if mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) { return "дня" }
        return "дней"
    }

    private static func albumUnit(_ value: Int) -> String {
        let mod10 = value % 10
        let mod100 = value % 100
        if mod10 == 1 && mod100 != 11 { return "альбом" }
        if mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) { return "альбома" }
        return "альбомов"
    }

    static func pregnancyDayLabel(_ day: Int) -> String {
        "\(day)-й день"
    }

    static func pregnancyWeekDayLabel(week: Int, dayInWeek: Int) -> String {
        "\(week) неделя · \(dayInWeek)-й день"
    }

    static func parseDate(_ iso: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: iso) { return date }
        let plain = DateFormatter()
        plain.locale = Locale(identifier: "en_US_POSIX")
        plain.dateFormat = "yyyy-MM-dd"
        plain.isLenient = false
        return plain.date(from: iso)
    }

    static func shortDate(_ iso: String) -> String {
        guard let parsed = parseDate(iso) else { return "Дата не указана" }
        let display = DateFormatter()
        display.locale = Locale(identifier: "ru_RU")
        display.dateFormat = "d MMMM"
        return display.string(from: parsed)
    }

    static func remainingPages(_ count: Int) -> String {
        if count == 1 { return "Осталась 1 страница" }
        return "Осталось \(max(0, count)) стр."
    }

    static func progressLabel(_ item: WidgetContinueItem) -> String {
        if let filled = item.filledPages, let total = item.totalPages, total > 0 {
            return "\(filled) из \(total) стр. сохранено"
        }
        return item.instanceId.isEmpty ? "Начните свою историю" : "Альбом заполнен на \(min(100, max(0, item.percent)))%"
    }

    static func trimText(_ text: String, maxLength: Int) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count <= maxLength { return trimmed }
        return String(trimmed.prefix(max(0, maxLength - 1))).trimmingCharacters(in: .whitespacesAndNewlines) + "…"
    }
}
