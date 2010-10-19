{
    types: {
        "Work" : {
            pluralLabel: "Works"
        }
    },
    properties: {
        "citing": {
            valueType: "item",
        },
        "cited": {
            valueType: "item",
        },
        "citationCount": {
            valueType: "number"
        },
        "published": {
            valueType: "date"
        }
    },
    items: [
        {   type: "Work",
            label: "W001",
            title: "Some paper",
            authors: ["A001", "A002"],
            published: "2010-02-01",
            citationCount: 132,
        },
        {   type: "Work",
            label: "W002",
            title: "Some paper",
            authors: ["A001", "A002"],
            published: "2010-02-01",
            citationCount: 132,
        },
        {   type: "Work",
            label: "W003",
            title: "Another paper",
            authors: [],
            published: "2009-06-12",
            citationCount: 132,
        },
        {
            type: "Citation",
            label: "C001",
            citing: "W001",
            cited: "W002",
        },
        {
            type: "Citation",
            label: "C002",
            citing: "W002",
            cited: "W003",
        },
    ]
}
  
