const getSorter = (options: { column: string; desc: boolean }) => (
  result: number
) => result * (options.desc ? -1 : 1);

export const sorter = <T extends Record<string, any>>(options: {
  column: string;
  desc: boolean;
}) => {
  return (first: T, second: T): number => {
    const sorter = getSorter(options);

    if (options.column === 'title') {
      return sorter(
        first[options.column].localeCompare(second[options.column])
      );
    }

    return sorter(+first[options.column] - +second[options.column]);
  };
};
