// matchfoundr · Native Auth

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct AuthView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.openURL) private var openURL
    @FocusState private var focusedField: Field?

    @State private var mode: Mode = .signup
    @State private var email = ""
    @State private var password = ""
    @State private var isWorking = false
    @State private var localMessage: String?

    enum Mode: String, CaseIterable, Identifiable {
        case signup
        case login
        case magic

        var id: String { rawValue }
        var title: String {
            switch self {
            case .signup: "Registrieren"
            case .login: "Anmelden"
            case .magic: "Magic Link"
            }
        }
        var headline: String {
            switch self {
            case .signup: "Founder-Profil erstellen"
            case .login: "Willkommen zurück"
            case .magic: "Magic Link"
            }
        }
        var subtitle: String {
            switch self {
            case .signup: "Beginne mit deinem matchfoundr-Konto."
            case .login: "Melde dich an, um weiterzumachen."
            case .magic: "Login ohne Passwort per E-Mail-Link."
            }
        }
        var actionTitle: String {
            switch self {
            case .signup: "Konto erstellen"
            case .login: "Anmelden"
            case .magic: "Magic Link senden"
            }
        }
    }

    enum Field {
        case email
        case password
    }

    var body: some View {
        ZStack {
            MF.canvas.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    authCard
                    trustRow
                }
                .padding(20)
                .padding(.top, 18)
            }
            .scrollIndicators(.hidden)
        }
        .tint(MF.ember)
        .onAppear {
            if email.isEmpty {
                focusedField = .email
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 9) {
                MFLogo(size: 21)
                Text("matchfoundr")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundStyle(MF.ink)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(mode.headline)
                    .font(.system(size: 29, weight: .heavy))
                    .foregroundStyle(MF.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(mode.subtitle)
                    .font(.system(size: 14.5, weight: .medium))
                    .foregroundStyle(MF.smoke)
                    .lineSpacing(3)
            }
        }
    }

    private var authCard: some View {
        VStack(alignment: .leading, spacing: 15) {
            Picker("Modus", selection: $mode) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.title).tag(mode)
                }
            }
            .pickerStyle(.segmented)

            VStack(spacing: 10) {
                authField(
                    icon: "envelope.fill",
                    title: "E-Mail",
                    placeholder: "du@startup.de",
                    text: $email,
                    contentType: .emailAddress,
                    field: .email
                )
                if mode != .magic {
                    passwordField
                }
            }

            if let message = localMessage ?? state.authMessage {
                statusPill(message, icon: "checkmark.seal.fill", color: Color.green)
            }
            if let error = state.authError {
                statusPill(error, icon: "exclamationmark.triangle.fill", color: MF.ember)
            }

            Button {
                Task { await submit() }
            } label: {
                HStack(spacing: 8) {
                    if isWorking {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isWorking ? "Verbinde..." : mode.actionTitle)
                        .font(.system(size: 15, weight: .bold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(canSubmit ? AnyShapeStyle(MF.emberGrad) : AnyShapeStyle(MF.faint.opacity(0.45)))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!canSubmit || isWorking)

            HStack(spacing: 10) {
                ForEach(OAuthProvider.nativeEnabledProviders) { provider in
                    Button {
                        Haptics.tap()
                        openURL(Backend.oauthURL(provider: provider))
                    } label: {
                        HStack(spacing: 7) {
                            Image(systemName: provider.icon)
                                .font(.system(size: 14, weight: .bold))
                            Text("Mit \(provider.label)")
                                .font(.system(size: 13.5, weight: .bold))
                        }
                        .foregroundStyle(MF.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 45)
                        .background(MF.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MF.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(spacing: 9) {
                if mode != .login {
                    modeLink("Schon ein Konto? Anmelden") { mode = .login }
                }
                if mode != .signup {
                    modeLink("Noch kein Konto? Registrieren") { mode = .signup }
                }
                if mode != .magic {
                    modeLink("Magic Link Login") { mode = .magic }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(16)
        .background(MF.surface)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(MF.border, lineWidth: 1))
        .warmShadow(large: true)
    }

    private func authField(
        icon: String,
        title: String,
        placeholder: String,
        text: Binding<String>,
        contentType: UITextContentType,
        field: Field
    ) -> some View {
        HStack(spacing: 11) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MF.emberDeep)
                .frame(width: 30, height: 30)
                .background(MF.emberTint)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundStyle(MF.faint)
                TextField(placeholder, text: text)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(MF.ink)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textContentType(contentType)
                    .focused($focusedField, equals: field)
                    .submitLabel(.next)
                    .onSubmit { focusedField = mode == .magic ? nil : .password }
            }
        }
        .padding(.horizontal, 13)
        .frame(height: 60)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.borderSoft, lineWidth: 1))
    }

    private var passwordField: some View {
        HStack(spacing: 11) {
            Image(systemName: "lock.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MF.emberDeep)
                .frame(width: 30, height: 30)
                .background(MF.emberTint)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("Passwort")
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundStyle(MF.faint)
                SecureField("Mindestens 8 Zeichen", text: $password)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(MF.ink)
                    .textContentType(mode == .login ? .password : .newPassword)
                    .focused($focusedField, equals: .password)
                    .submitLabel(.go)
                    .onSubmit { Task { await submit() } }
            }
        }
        .padding(.horizontal, 13)
        .frame(height: 60)
        .background(MF.surfaceSoft)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(MF.borderSoft, lineWidth: 1))
    }

    private func statusPill(_ text: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
            Text(text)
                .font(.system(size: 12.5, weight: .semibold))
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(color)
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var trustRow: some View {
        VStack(alignment: .leading, spacing: 9) {
            Label("Session wird sicher im iOS Keychain gespeichert.", systemImage: "key.fill")
            Label("Co-Pilot und Live-Daten laufen mit deinem Supabase-User.", systemImage: "bolt.horizontal.circle.fill")
            Label("Kein Service-Role-Key in der App.", systemImage: "shield.lefthalf.filled")
        }
        .font(.system(size: 12.5, weight: .semibold))
        .foregroundStyle(MF.smoke)
        .padding(.horizontal, 2)
    }

    private var emailLooksValid: Bool {
        email.trimmingCharacters(in: .whitespacesAndNewlines).contains("@")
    }

    private var canSubmit: Bool {
        emailLooksValid && (mode == .magic || password.count >= 8)
    }

    private func submit() async {
        guard canSubmit, !isWorking else { return }
        isWorking = true
        localMessage = nil
        defer { isWorking = false }
        do {
            switch mode {
            case .signup:
                try await state.signUp(email: cleanEmail, password: password)
            case .login:
                try await state.signIn(email: cleanEmail, password: password)
            case .magic:
                try await state.sendMagicLink(email: cleanEmail)
                localMessage = "Magic Link ist unterwegs."
            }
        } catch {
            state.authError = state.friendlyAuthError(error)
        }
    }

    private var cleanEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private func modeLink(_ title: String, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            localMessage = nil
            state.authError = nil
            action()
        } label: {
            Text(title)
                .font(.system(size: 13.5, weight: .semibold))
                .foregroundStyle(MF.smoke)
                .underline()
        }
        .buttonStyle(.plain)
    }
}
