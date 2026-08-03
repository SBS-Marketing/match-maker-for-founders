// Unterlagen-Sync: Datei in den privaten Bucket "media", Metadaten und
// extrahierter Text in public.document_assets.
//
// Beides hängt an derselben Auth wie der Rest der App — die Storage-Policy
// erlaubt nur den eigenen Ordner (erster Pfadabschnitt = User-ID), die
// Tabelle nur die eigenen Zeilen. Ohne Login passiert nichts; die Unterlage
// bleibt dann lokal und wird beim nächsten Start nachgereicht.

import Foundation
import Supabase

/// Eine Zeile aus public.document_assets.
struct DocumentAssetRow: Codable {
    let id: UUID
    let userID: UUID
    let title: String
    let fileName: String
    let kind: String
    let sizeBytes: Int64
    let storagePath: String?
    let textPreview: String
    let textContent: String
    let importedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, kind
        case userID = "user_id"
        case fileName = "file_name"
        case sizeBytes = "size_bytes"
        case storagePath = "storage_path"
        case textPreview = "text_preview"
        case textContent = "text_content"
        case importedAt = "imported_at"
    }

    var asset: FounderDocumentAsset {
        FounderDocumentAsset(
            id: id,
            title: title,
            fileName: fileName,
            kind: FounderDocumentAssetKind(rawValue: kind) ?? .upload,
            sizeBytes: sizeBytes,
            importedAt: importedAt,
            textPreview: textPreview,
            storagePath: storagePath ?? ""
        )
    }
}

enum DocumentSync {
    static let bucket = "media"

    /// <user-id>/<asset-id>.<ext> — der erste Abschnitt muss die User-ID sein,
    /// sonst greift die Storage-Policy nicht.
    static func storagePath(userID: String, asset: FounderDocumentAsset) -> String {
        let ext = URL(fileURLWithPath: asset.fileName).pathExtension.lowercased()
        let suffix = ext.isEmpty ? "dat" : ext
        return "\(userID)/\(asset.id.uuidString).\(suffix)"
    }

    private static func contentType(for fileName: String) -> String {
        switch URL(fileURLWithPath: fileName).pathExtension.lowercased() {
        case "pdf": "application/pdf"
        case "txt", "md": "text/plain"
        case "csv": "text/csv"
        case "json": "application/json"
        case "rtf": "application/rtf"
        case "png": "image/png"
        case "jpg", "jpeg": "image/jpeg"
        case "heic": "image/heic"
        default: "application/octet-stream"
        }
    }

    /// Lädt die Datei hoch und schreibt die Metadaten-Zeile. Gibt den Pfad im
    /// Bucket zurück. `upsert` ist an, damit ein zweiter Versuch nach einem
    /// Abbruch nicht an einer halben Datei scheitert.
    @discardableResult
    static func push(
        asset: FounderDocumentAsset,
        localURL: URL?,
        userID: String,
        textContent: String
    ) async throws -> String {
        let path = storagePath(userID: userID, asset: asset)

        if let localURL, FileManager.default.fileExists(atPath: localURL.path) {
            try await Backend.client.storage
                .from(bucket)
                .upload(
                    path,
                    fileURL: localURL,
                    options: FileOptions(
                        cacheControl: "3600",
                        contentType: contentType(for: asset.fileName),
                        upsert: true
                    )
                )
        }

        struct Upsert: Encodable {
            let id: UUID
            let user_id: String
            let title: String
            let file_name: String
            let kind: String
            let size_bytes: Int64
            let storage_path: String
            let text_preview: String
            let text_content: String
            let imported_at: String
            let updated_at: String
        }
        let now = ISO8601DateFormatter().string(from: .now)
        try await Backend.client
            .from("document_assets")
            .upsert(
                Upsert(
                    id: asset.id,
                    user_id: userID,
                    title: asset.title,
                    file_name: asset.fileName,
                    kind: asset.kind.rawValue,
                    size_bytes: asset.sizeBytes,
                    storage_path: path,
                    text_preview: asset.textPreview,
                    // Grosszügig deckeln: der Volltext ist die Grundlage dafür,
                    // dass der Co-Pilot die Unterlage wirklich lesen kann.
                    text_content: String(textContent.prefix(60_000)),
                    imported_at: ISO8601DateFormatter().string(from: asset.importedAt),
                    updated_at: now
                ),
                onConflict: "id"
            )
            .execute()

        return path
    }

    static func fetchRows(userID: String) async throws -> [DocumentAssetRow] {
        try await Backend.client
            .from("document_assets")
            .select("id,user_id,title,file_name,kind,size_bytes,storage_path,text_preview,text_content,imported_at")
            .eq("user_id", value: userID)
            .order("imported_at", ascending: false)
            .limit(80)
            .execute()
            .value
    }

    static func download(path: String) async throws -> Data {
        try await Backend.client.storage.from(bucket).download(path: path)
    }

    static func remove(asset: FounderDocumentAsset, userID: String) async throws {
        let path = asset.storagePath.isEmpty
            ? storagePath(userID: userID, asset: asset)
            : asset.storagePath
        // Erst die Zeile, dann die Datei: eine verwaiste Datei ist harmloser
        // als eine Zeile, die auf nichts zeigt.
        try await Backend.client
            .from("document_assets")
            .delete()
            .eq("id", value: asset.id.uuidString)
            .execute()
        try await Backend.client.storage.from(bucket).remove(paths: [path])
    }
}
