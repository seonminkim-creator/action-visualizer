declare module 'japanese-holidays' {
  interface Holiday {
    name: string;
    date: Date;
  }

  function isHoliday(date: Date): boolean;
  function getHolidaysOf(year: number): Holiday[];

  const JapaneseHolidays: {
    isHoliday: typeof isHoliday;
    getHolidaysOf: typeof getHolidaysOf;
  };

  export default JapaneseHolidays;
}
