# API Hooks Usage Guide

## Features
- ✅ Automatic caching (5-10 minutes)
- ✅ Request deduplication (prevents duplicate calls within 100ms)
- ✅ Background refetching
- ✅ Stale-while-revalidate pattern
- ✅ Automatic retry with exponential backoff
- ✅ Optimistic updates
- ✅ Cache invalidation

## Usage Examples

### Fetching Data
```tsx
import { useStudents, useOverview } from '@/hooks/useApi';

function MyComponent() {
  const { data, isLoading, error, refetch } = useStudents();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data.map(student => ...)}</div>;
}
```

### Updating Data
```tsx
import { useUpdateUser } from '@/hooks/useApi';

function UpdateComponent() {
  const updateUser = useUpdateUser();
  
  const handleUpdate = async () => {
    await updateUser.mutateAsync({
      admissionNumber: '123',
      attendance: { coffee: { present: true } }
    });
  };
  
  return <button onClick={handleUpdate}>Update</button>;
}
```

### Prefetching (for faster navigation)
```tsx
import { usePrefetch } from '@/hooks/useApi';

function Navigation() {
  const { prefetchUsers, prefetchOverview } = usePrefetch();
  
  return (
    <Link 
      href="/users" 
      onMouseEnter={prefetchUsers} // Prefetch on hover
    >
      Users
    </Link>
  );
}
```

### Conditional Fetching
```tsx
const { data } = useUser(admissionNumber, {
  enabled: !!admissionNumber, // Only fetch if admissionNumber exists
});
```

### Auto-refetch
```tsx
const { data } = useAttendance({
  refetchInterval: 30000, // Refetch every 30 seconds
});
```

## Cache Configuration

- **Students/Users**: 5 minutes stale time
- **Attendance**: 1 minute stale time + auto-refetch every 2 minutes
- **Overview**: 2 minutes stale time
- **Settings**: 10 minutes stale time
- **Admin Stats**: 2 minutes stale time + auto-refetch every 5 minutes

## Request Deduplication

Multiple identical requests within 100ms are automatically deduplicated:
```tsx
// These 3 calls will only make 1 actual HTTP request
useStudents(); // Component 1
useStudents(); // Component 2
useStudents(); // Component 3
```
