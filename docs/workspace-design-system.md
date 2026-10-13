# BlueMind Workspace Design System Rule

BlueMind Workspace uses one shared employee interface for all employee accounts.

## Permanent Rule

One workspace design serves all employees. Employee-specific differences must come from authenticated backend data, role-based configuration, and permissions, not duplicated page implementations.

## Applies To

- Dashboard
- My Tasks
- My Projects
- Designs
- Code & Repositories
- App Builds
- Messages
- Meetings
- Work Time
- My Schedule
- My Tools
- My Profile
- Notifications
- Sidebar and navigation

## Implementation Rules

- Reuse shared React components for employee workspace sections.
- Keep design, spacing, styling, responsive behavior, and animations shared.
- Keep role differences in configuration and backend data.
- Do not decide permissions or private data access from frontend-only state.
- Do not create separate copies of the same page for Ahmed, Ammar, and Patrick Jane.
- Do not hardcode employee names to decide which data or permissions to display.
- If a shared section is redesigned, update the shared component once so all relevant employee accounts receive the change.

## Role-Based Content

- iOS Developer: receives iOS tasks, iOS projects, iOS tools, and shared workspace sections.
- Android Developer: receives Android tasks, Android projects, Android tools, and shared workspace sections.
- UI/UX Designer: receives design tasks, design projects, design tools, and shared workspace sections.

## Admin Accounts

Mohammed and Rokaia keep their administrator permissions and management features. Shared visual elements such as notifications, Messenger styling, buttons, and brand styles should remain consistent where they apply, without removing admin functionality.

## Development Checklist

Before finishing a Workspace design change:

- Identify the shared component that owns the section.
- Modify that component once.
- Confirm role-specific content still comes from authenticated data or role configuration.
- Test Ahmed, Ammar, and Patrick Jane.
- Verify no employee account still uses an older duplicated design.
- Confirm admin-only access remains protected.
