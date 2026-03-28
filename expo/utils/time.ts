export const formatDuration = (milliseconds: number): string => {
  if (!milliseconds || milliseconds < 0) return "0h 0m";
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const formatTime = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return '';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return '';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString([], { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatDateFull = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return '';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString([], { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatPayPeriodRange = (startDate: number, endDate: number): string => {
  if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  
  // If same month
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}–${end.toLocaleDateString([], { day: 'numeric' })}`;
  }
  
  // If same year but different month
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}–${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }
  
  // Different years
  return `${start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}–${end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export const calculateEarnings = (hourlyRate: number, milliseconds: number): number => {
  if (!hourlyRate || !milliseconds || isNaN(hourlyRate) || isNaN(milliseconds)) return 0;
  
  const hours = milliseconds / (1000 * 60 * 60);
  return hourlyRate * hours;
};

export const getStartOfWeek = (date: Date | number, startDay: number = 0): Date => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) return new Date();
  
  const day = inputDate.getDay();
  const diff = (day < startDay ? 7 : 0) + day - startDay;
  const result = new Date(inputDate);
  result.setDate(inputDate.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getEndOfWeek = (date: Date | number, startDay: number = 0): Date => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) return new Date();
  
  const start = getStartOfWeek(inputDate, startDay);
  const result = new Date(start);
  result.setDate(start.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getStartOfBiWeek = (date: Date | number, startDay: number = 0): Date => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) return new Date();
  
  const start = getStartOfWeek(inputDate, startDay);
  const daysSinceEpoch = Math.floor(start.getTime() / (24 * 60 * 60 * 1000));
  const biWeekOffset = daysSinceEpoch % 14;
  const result = new Date(start);
  result.setDate(start.getDate() - biWeekOffset);
  return result;
};

export const getEndOfBiWeek = (date: Date | number, startDay: number = 0): Date => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) return new Date();
  
  const start = getStartOfBiWeek(inputDate, startDay);
  const result = new Date(start);
  result.setDate(start.getDate() + 13);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getStartOfMonth = (date: Date | number, startDay: number = 1): Date => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) return new Date();
  
  const result = new Date(inputDate.getFullYear(), inputDate.getMonth(), startDay);
  
  // If startDay is greater than the number of days in the month,
  // we need to go back to the previous month
  if (startDay > 28) {
    const daysInMonth = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0).getDate();
    if (startDay > daysInMonth) {
      result.setDate(daysInMonth);
    }
  }
  
  // If the date is before the start day of the current month,
  // we need to go back to the previous month's start day
  if (inputDate.getDate() < startDay) {
    result.setMonth(result.getMonth() - 1);
  }
  
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getEndOfMonth = (date: Date | number, startDay: number = 1): Date => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) return new Date();
  
  const start = getStartOfMonth(inputDate, startDay);
  const result = new Date(start);
  result.setMonth(result.getMonth() + 1);
  result.setDate(result.getDate() - 1);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getPayPeriodDates = (
  date: Date | number, 
  periodType: string = 'weekly', 
  startDay: number = 0
): { start: Date, end: Date } => {
  // Handle both Date objects and timestamps
  const inputDate = typeof date === 'number' ? new Date(date) : date;
  
  if (!inputDate || isNaN(inputDate.getTime())) {
    const now = new Date();
    return {
      start: getStartOfWeek(now, startDay),
      end: getEndOfWeek(now, startDay)
    };
  }
  
  switch (periodType) {
    case 'weekly':
      return {
        start: getStartOfWeek(inputDate, startDay),
        end: getEndOfWeek(inputDate, startDay)
      };
    case 'biweekly':
      return {
        start: getStartOfBiWeek(inputDate, startDay),
        end: getEndOfBiWeek(inputDate, startDay)
      };
    case 'monthly':
      return {
        start: getStartOfMonth(inputDate, startDay),
        end: getEndOfMonth(inputDate, startDay)
      };
    default:
      return {
        start: getStartOfWeek(inputDate, startDay),
        end: getEndOfWeek(inputDate, startDay)
      };
  }
};