# Ruka Shule Frontend

School fees tracking system frontend built with Next.js, React, TypeScript, and shadcn/ui components.

## Features

- **Authentication**: Register and login pages with JWT token management
- **Admin Dashboard**: Onboard and manage schools
- **School Admin Dashboard**: Manage students, fees, and payments (role-based access)
- **Public Student Lookup**: Mobile-friendly page for students/parents to find their records (no login required)
- **Role-Based Access Control**: Different dashboards and features based on user role
- **Responsive Design**: Mobile-first design that works on all devices
- **shadcn/ui Components**: Beautiful, accessible UI components

## Tech Stack

- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS 4**: Styling
- **shadcn/ui**: Component library
- **Axios**: HTTP client for API calls
- **Lucide React**: Icon library
- **Radix UI**: Accessible component primitives

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running on `http://localhost:8080`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ruka-shule-fe/
├── app/
│   ├── dashboard/          # Protected dashboard pages
│   │   ├── page.tsx        # Main dashboard (role-based)
│   │   ├── schools/        # Admin: School management
│   │   ├── students/        # School Admin: Student management
│   │   ├── payments/       # School Admin: Payment tracking
│   │   ├── fees/           # School Admin: Fee management
│   │   └── settings/       # Settings page
│   ├── login/              # Login page
│   ├── register/            # Registration page
│   ├── lookup/             # Public student lookup page
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Home page (redirects to dashboard or login)
│   └── globals.css         # Global styles with shadcn/ui theme
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── select.tsx
│   │   └── label.tsx
│   ├── DashboardLayout.tsx # Dashboard layout with sidebar
│   └── ProtectedRoute.tsx  # Route protection component
├── contexts/
│   └── AuthContext.tsx      # Authentication context provider
└── lib/
    ├── api.ts              # API client and endpoints
    └── utils.ts            # Utility functions (cn helper)
```

## Pages

### Public Pages

- **`/`**: Home page (redirects based on auth status)
- **`/login`**: Login page with shadcn/ui components
- **`/register`**: Registration page with shadcn/ui components
- **`/lookup`**: Public student lookup (mobile-friendly, no auth required)

### Protected Pages (Require Authentication)

- **`/dashboard`**: Main dashboard (shows different content based on role)
  - **Admin**: School management overview
  - **School Admin**: Student and payment overview
- **`/dashboard/schools`**: Admin only - School onboarding and management
- **`/dashboard/students`**: School Admin only - Student management
- **`/dashboard/payments`**: School Admin only - Payment tracking
- **`/dashboard/fees`**: School Admin only - Fee management
- **`/dashboard/settings`**: Settings page

## shadcn/ui Components

The project uses shadcn/ui for all UI components:

- **Button**: Various variants (default, outline, ghost, etc.)
- **Input**: Form inputs with icons
- **Card**: Container components
- **Table**: Data tables
- **Badge**: Status indicators
- **Select**: Dropdown selects
- **Label**: Form labels

All components are customizable and follow the Rukapay blue theme.

## Color Scheme

The application uses **Rukapay Blue** as the primary color:
- Primary Blue: `#0066CC` (hsl(210 100% 40%))
- Dark Blue: `#0052A3`
- Light Blue: `#E6F2FF`

Colors are defined using CSS variables in `globals.css` for easy theming.

## Role-Based Access

### Admin Role
- Can onboard new schools
- Can view and manage all schools
- Can approve schools
- Access to school management features

### School Admin Role
- Can manage students in their school
- Can set and manage fees
- Can view payments and generate receipts
- Can send SMS notifications
- Cannot access school onboarding features

## API Integration

The frontend integrates with the backend API at `http://localhost:8080/api`. All API calls are handled through the `lib/api.ts` file, which includes:

- Authentication endpoints
- School management
- Student management
- Payment processing
- Fee management
- Receipt generation
- SMS notifications

## Development

### Adding New shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

### Styling

- Use Tailwind CSS utility classes
- Follow the Rukapay blue color scheme
- Use shadcn/ui components for consistency
- Ensure mobile responsiveness
- Use Lucide React icons

## Build

```bash
npm run build
npm start
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8080/api`)

## shadcn/ui Configuration

The project is configured with shadcn/ui. Configuration is in `components.json`:
- Style: default
- RSC: true (React Server Components)
- Tailwind CSS v4 with CSS variables
- Component aliases set up for easy imports
