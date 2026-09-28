export const filterData = (data, keyword, fields) => {
  if (!keyword.trim()) return data;

  const search = keyword.toLowerCase();

  return data.filter((item) =>
    fields.some((field) =>
      field
        .split(".")
        .reduce((obj, key) => obj?.[key], item)
        ?.toString()
        .toLowerCase()
        .includes(search)
    )
  );
};