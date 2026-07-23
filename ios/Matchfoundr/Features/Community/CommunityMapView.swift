// CommunityMapView — Events als MapKit-Karte (DACH). Pins pro Stadt,
// Tippen filtert die Liste darunter. MapKit ist eingebaut — kein
// externer Kartendienst, kein Key. Passend zum Web-/events-Pendant.

import MapKit
import SwiftUI

// MARK: - Geokodierung (Spiegel von src/lib/events-geo.ts)

enum EventGeo {
    static let cities: [String: CLLocationCoordinate2D] = [
        "köln": .init(latitude: 50.938, longitude: 6.96),
        "koeln": .init(latitude: 50.938, longitude: 6.96),
        "berlin": .init(latitude: 52.52, longitude: 13.405),
        "münchen": .init(latitude: 48.137, longitude: 11.575),
        "muenchen": .init(latitude: 48.137, longitude: 11.575),
        "hamburg": .init(latitude: 53.551, longitude: 9.993),
        "frankfurt": .init(latitude: 50.11, longitude: 8.682),
        "stuttgart": .init(latitude: 48.776, longitude: 9.182),
        "düsseldorf": .init(latitude: 51.228, longitude: 6.773),
        "duesseldorf": .init(latitude: 51.228, longitude: 6.773),
        "leipzig": .init(latitude: 51.34, longitude: 12.375),
        "dresden": .init(latitude: 51.05, longitude: 13.737),
        "hannover": .init(latitude: 52.376, longitude: 9.732),
        "nürnberg": .init(latitude: 49.452, longitude: 11.077),
        "nuernberg": .init(latitude: 49.452, longitude: 11.077),
        "bremen": .init(latitude: 53.079, longitude: 8.802),
        "dortmund": .init(latitude: 51.514, longitude: 7.466),
        "essen": .init(latitude: 51.456, longitude: 7.012),
        "bonn": .init(latitude: 50.737, longitude: 7.098),
        "mannheim": .init(latitude: 49.487, longitude: 8.466),
        "karlsruhe": .init(latitude: 49.007, longitude: 8.404),
        "freiburg": .init(latitude: 47.999, longitude: 7.842),
        "münster": .init(latitude: 51.96, longitude: 7.626),
        "muenster": .init(latitude: 51.96, longitude: 7.626),
        "aachen": .init(latitude: 50.776, longitude: 6.084),
        "kiel": .init(latitude: 54.323, longitude: 10.135),
        "wien": .init(latitude: 48.208, longitude: 16.373),
        "graz": .init(latitude: 47.071, longitude: 15.439),
        "linz": .init(latitude: 48.306, longitude: 14.286),
        "salzburg": .init(latitude: 47.809, longitude: 13.055),
        "innsbruck": .init(latitude: 47.269, longitude: 11.404),
        "zürich": .init(latitude: 47.377, longitude: 8.542),
        "zuerich": .init(latitude: 47.377, longitude: 8.542),
        "bern": .init(latitude: 46.948, longitude: 7.447),
        "basel": .init(latitude: 47.559, longitude: 7.588),
        "genf": .init(latitude: 46.204, longitude: 6.143),
    ]

    static func coordinate(for city: String) -> CLLocationCoordinate2D? {
        let key = city.lowercased().split(whereSeparator: { ",/(".contains($0) }).first.map(String.init)?
            .trimmingCharacters(in: .whitespaces) ?? city.lowercased()
        if let exact = cities[key] { return exact }
        for (known, coord) in cities where key.hasPrefix(known) || known.hasPrefix(key) {
            return coord
        }
        return nil
    }
}

/// Ein Kartenpunkt = eine Stadt mit ihren Events.
struct EventCityPin: Identifiable {
    let id: String          // Stadt-Key
    let city: String
    let coordinate: CLLocationCoordinate2D
    let events: [CommunityEvent]
}

func eventCityPins(_ events: [CommunityEvent]) -> [EventCityPin] {
    var byCity: [String: (coord: CLLocationCoordinate2D, city: String, events: [CommunityEvent])] = [:]
    for ev in events {
        guard !ev.city.isEmpty, let coord = EventGeo.coordinate(for: ev.city) else { continue }
        let key = ev.city.lowercased().split(whereSeparator: { ",/(".contains($0) }).first.map(String.init) ?? ev.city.lowercased()
        if byCity[key] != nil {
            byCity[key]!.events.append(ev)
        } else {
            byCity[key] = (coord, ev.city, [ev])
        }
    }
    return byCity.map { EventCityPin(id: $0.key, city: $0.value.city, coordinate: $0.value.coord, events: $0.value.events) }
}

// MARK: - Karten-View

struct CommunityMapView: View {
    let events: [CommunityEvent]
    @Binding var selectedCity: String?
    var onOpenEvent: (CommunityEvent) -> Void

    // DACH-Ausschnitt.
    @State private var position: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.6, longitude: 10.5),
            span: MKCoordinateSpan(latitudeDelta: 9.5, longitudeDelta: 12.0)
        )
    )

    private var pins: [EventCityPin] { eventCityPins(events) }

    private var visibleEvents: [CommunityEvent] {
        if let city = selectedCity {
            return pins.first { $0.city == city }?.events ?? []
        }
        return events
    }

    var body: some View {
        VStack(spacing: 0) {
            Map(position: $position) {
                ForEach(pins) { pin in
                    Annotation(pin.city, coordinate: pin.coordinate) {
                        Button {
                            Haptics.select()
                            selectedCity = selectedCity == pin.city ? nil : pin.city
                        } label: {
                            MapPinLabel(count: pin.events.count, active: selectedCity == pin.city)
                        }
                        .buttonStyle(.plain)
                    }
                    .annotationTitles(.hidden)
                }
            }
            .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
            .frame(height: 300)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MF.border, lineWidth: 1))
            .padding(.horizontal, 20)

            // Gefilterte Liste
            HStack {
                Text(selectedCity.map { "\($0) · \(visibleEvents.count) Events" } ?? "Alle Events")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(MF.smoke)
                Spacer()
                if selectedCity != nil {
                    Button("Alle zeigen") { selectedCity = nil }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MF.ember)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 8)

            LazyVStack(spacing: 12) {
                ForEach(visibleEvents) { event in
                    Button {
                        Haptics.tap()
                        onOpenEvent(event)
                    } label: {
                        EventCard(event: event, registered: false)
                    }
                    .buttonStyle(.plain)
                }
                if visibleEvents.isEmpty {
                    Text("Keine Events hier — wähl eine andere Stadt.")
                        .font(.system(size: 13))
                        .foregroundStyle(MF.smoke)
                        .padding(.vertical, 20)
                }
            }
            .padding(.horizontal, 20)
        }
    }
}

private struct MapPinLabel: View {
    let count: Int
    let active: Bool

    var body: some View {
        Text("\(count)")
            .font(.system(size: 12, weight: .heavy))
            .foregroundStyle(.white)
            .frame(width: active ? 32 : 26, height: active ? 32 : 26)
            .background(active ? MF.emberDeep : MF.ember)
            .clipShape(Circle())
            .overlay(Circle().stroke(.white, lineWidth: 2))
            .shadow(color: MF.ember.opacity(0.5), radius: active ? 8 : 4, y: 2)
    }
}
