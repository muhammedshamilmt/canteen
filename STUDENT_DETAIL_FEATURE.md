# Student Detail Page Feature

## Overview
A comprehensive student profile page with attendance history, leave tracking, and detailed statistics.

## Features Implemented

### 1. API Route (`/api/students/[id]`)
- Fetch student by admission number or ObjectId
- Get attendance history (last 30 days)
- Get leave/sick history
- Calculate statistics
- HTTP caching with stale-while-revalidate

### 2. Student Detail Page (`/students/[id]`)
- **Basic Information Card**
  - Avatar with initial
  - Name, admission number
  - Email, phone, campus, class, table
  - Current status badge (Active/Sick)

- **Statistics Card**
  - Days tracked
  - Total leaves
  - Attendance rate percentage

- **Current Meal Attendance**
  - Visual status for all 5 meals
  - Color-coded: Green (present), Red (absent), Orange (sick)

- **Leave & Sick History**
  - Chronological list of all leaves
  - Reason, dates, notes
  - Type badges

- **Attendance History**
  - Last 30 days of attendance
  - Visual meal attendance bars
  - Date formatting

### 3. Navigation
- "View Details" button (eye icon) added to Students Management page
- Back button on detail page
- Error handling with user-friendly messages

### 4. Caching & Performance
- React Query integration
- 2-minute stale time
- Automatic background refetching
- Loading skeletons
- Request deduplication

## Database Collections Used

### `students`
Main student information

### `users`
Current attendance status

### `attendance_history`
```javascript
{
  admissionNumber: string,
  date: Date,
  meals: {
    coffee: boolean,
    breakfast: boolean,
    lunch: boolean,
    tea: boolean,
    dinner: boolean
  }
}
```

### `leave_history`
```javascript
{
  admissionNumber: string,
  type: 'sick' | 'leave',
  reason: string,
  startDate: Date,
  endDate: Date,
  notes: string
}
```

## Usage

### Access Student Detail
1. Go to Admin > Students
2. Click the eye icon next to any student
3. View comprehensive profile

### Direct URL
```
/students/[admissionNumber]
/students/[objectId]
```

### Programmatic Navigation
```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push(`/students/${admissionNumber}`);
```

## Styling
- Responsive design (mobile-first)
- Tailwind CSS
- shadcn/ui components
- Color-coded status indicators
- Professional card layouts

## Future Enhancements
- Export student report (PDF)
- Edit student info inline
- Add leave/sick entry
- Attendance trends chart
- Email/SMS notifications
