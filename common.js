const calcSpanProps = (spanMonths, spanDays) =>
  spanMonths > 100
    ? {
      columnOffset: 14,
      columnUnit: "day",
      magnetUnit: "day",
      magnetOffset: 1,
      headers: [
        {
          unit: "year",
          format: "YYYY",
          offset: Math.floor(spanMonths / 120),
        },
      ],
    }
    : spanMonths > 36
      ? {
        columnOffset: 14,
        columnUnit: "day",
        magnetUnit: "day",
        magnetOffset: 1,
        alignStartTo: "year",
        headers: [
          {
            unit: "year",
            format: "YYYY",
            offset: 1,
          },
          { unit: "month", format: "[Q]Q", offset: 3 },
        ],
      }
      : spanMonths > 12
        ? {
          columnOffset: 14,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          alignStartTo: "quarter",
          headers: [
            {
              unit: "month",
              format: "YYYY[Q]Q",
              offset: 3,
            },
            { unit: "month", format: "MM", offset: 1 },
          ],
        }
        : spanDays > 80
          ? {
            columnOffset: 14,
            columnUnit: "day",
            magnetUnit: "day",
            magnetOffset: 1,
            alignStartTo: "month",
            headers: [
              {
                unit: "month",
                format: "MMM YYYY",
                offset: 1,
              },
              { unit: "week", format: "[W]w", offset: spanDays > 200 ? 2 : 1 },
            ],
          }
          : spanDays > 26
            ? {
              columnOffset: 14,
              columnUnit: "day",
              magnetUnit: "day",
              magnetOffset: 1,
              alignStartTo: "week",
              headers: [
                { unit: "week", format: "MM/YYYY [W]w", offset: 1 },
                { unit: "day", format: "DD", offset: Math.ceil(spanDays / 50) },
              ],
            }
            : spanDays > 20
              ? {
                columnOffset: 1,
                columnUnit: "day",
                magnetUnit: "day",
                magnetOffset: 1,
                alignStartTo: "week",
                headers: [
                  { unit: "week", format: "MMM YYYY [Week ]w", offset: 1 },

                  { unit: "day", format: "ddDD", offset: 1 },
                ],
              }
              : spanDays > 8
                ? {
                  columnOffset: 1,
                  columnUnit: "day",
                  magnetUnit: "day",
                  magnetOffset: 1,
                  alignStartTo: "week",
                  headers: [
                    { unit: "week", format: "MMM YYYY [Week ]w", offset: 1 },

                    { unit: "day", format: "ddd DD", offset: 1 },
                  ],
                }
                : spanDays > 4
                  ? {
                    columnOffset: 3,
                    columnUnit: "hour",
                    magnetUnit: "hour",
                    magnetOffset: 1,
                    alignStartTo: "day",

                    headers: [
                      { unit: "day", format: "ddd DD MMM YYYY", offset: 1 },
                      { unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) },
                    ],
                  }
                  : spanDays > 1
                    ? {
                      columnOffset: 60,
                      columnUnit: "minute",
                      magnetUnit: "minute",
                      magnetOffset: 30,
                      alignStartTo: "day",

                      headers: [
                        { unit: "day", format: "dddd DD MMM YYYY", offset: 1 },
                        { unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) },
                      ],
                    }
                    : {
                      columnOffset: 30,
                      columnUnit: "minute",
                      magnetUnit: "minute",
                      magnetOffset: 15,
                      alignStartTo: "day",
                      headers: [
                        { unit: "day", format: "dddd DD MMM YYYY", offset: 1 },
                        { unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) },
                      ],
                    };

module.exports = { calcSpanProps }