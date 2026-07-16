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

    enum CodingKeys: String, CodingKey {
        case id, title, category, categoryLabel, percent, celebration, coverType, pagesCount, photosCount, unfinishedPages
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
        unfinishedPages: Int?
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

    enum CodingKeys: String, CodingKey {
        case projectId, instanceId, projectTitle, pageTitle, percent, celebration, coverType
    }

    init(
        projectId: String,
        instanceId: String,
        projectTitle: String,
        pageTitle: String,
        percent: Int,
        celebration: String?,
        coverType: String?
    ) {
        self.projectId = projectId
        self.instanceId = instanceId
        self.projectTitle = projectTitle
        self.pageTitle = pageTitle
        self.percent = percent
        self.celebration = celebration
        self.coverType = coverType
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

    static func makeEntry() -> WidgetEntry {
        WidgetEntry(date: Date(), snapshot: loadSnapshot())
    }

    static func makeTimeline() -> Timeline<WidgetEntry> {
        let entry = makeEntry()
        let calendar = Calendar.current
        let nextHalfHour = calendar.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        let startOfTomorrow = calendar.startOfDay(
            for: calendar.date(byAdding: .day, value: 1, to: Date()) ?? Date()
        )
        let nextUpdate = min(nextHalfHour, startOfTomorrow)
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

enum WidgetDeepLinks {
    static let createAlbum = URL(string: "app018by://my-stories")!
    static let reminders = URL(string: "app018by://reminders-list")!
    static let notifications = URL(string: "app018by://notifications")!
    /// Opens paper-album helper where user can set ПДР.
    static let setPdr = URL(string: "app018by://paper-album-notifications")!
    static let home = URL(string: "app018by://")!

    static func albumPages(project: WidgetProjectItem) -> URL {
        var components = URLComponents(string: "app018by://album-pages")!
        var query: [URLQueryItem] = [URLQueryItem(name: "id", value: project.id)]
        if let celebration = project.celebration {
            query.append(URLQueryItem(name: "celebration", value: celebration))
        }
        if let coverType = project.coverType {
            query.append(URLQueryItem(name: "coverType", value: coverType))
        }
        components.queryItems = query
        return components.url ?? home
    }

    static func continueProject(_ item: WidgetContinueItem) -> URL {
        if item.instanceId.isEmpty {
            var components = URLComponents(string: "app018by://album-pages")!
            var query: [URLQueryItem] = [URLQueryItem(name: "id", value: item.projectId)]
            if let celebration = item.celebration {
                query.append(URLQueryItem(name: "celebration", value: celebration))
            }
            if let coverType = item.coverType {
                query.append(URLQueryItem(name: "coverType", value: coverType))
            }
            components.queryItems = query
            return components.url ?? home
        }

        var components = URLComponents(string: "app018by://album-page-form")!
        var query: [URLQueryItem] = [
            URLQueryItem(name: "id", value: item.projectId),
            URLQueryItem(name: "instanceId", value: item.instanceId),
        ]
        if let celebration = item.celebration {
            query.append(URLQueryItem(name: "celebration", value: celebration))
        }
        if let coverType = item.coverType {
            query.append(URLQueryItem(name: "coverType", value: coverType))
        }
        components.queryItems = query
        return components.url ?? home
    }

    static func pregnancyProject(_ item: WidgetPregnancyItem) -> URL {
        var components = URLComponents(string: "app018by://album-pages")!
        components.queryItems = [URLQueryItem(name: "id", value: item.projectId)]
        return components.url ?? home
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

    static func shortDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        guard let parsed = date else { return iso }
        let display = DateFormatter()
        display.locale = Locale(identifier: "ru_RU")
        display.dateStyle = .medium
        return display.string(from: parsed)
    }

    static func trimText(_ text: String, maxLength: Int) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count <= maxLength { return trimmed }
        return String(trimmed.prefix(maxLength - 1)).trimmingCharacters(in: .whitespacesAndNewlines) + "…"
    }
}
