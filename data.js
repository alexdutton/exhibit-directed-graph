{
    types: {
        "Work" : {
            pluralLabel: "Works"
        }
    },
    properties: {
        "cites": {
            valueType: "item",
            reverseLabel: "is cited by"
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
            cites: ["W002"],
            published: "2010-02-01",
            citationCount: 132,
        },
        {   type: "Work",
            label: "W002",
            title: "Some paper",
            authors: ["A001", "A002"],
            cites: ["W003"],
            published: "2010-02-01",
            citationCount: 132,
        },
        {   type: "Work",
            label: "W003",
            title: "Another paper",
            authors: [],
            cites: [],
            published: "2009-06-12",
            citationCount: 132,
        }
    ]
}
  
