import sys
import hashlib

from functools import partial
from operator import eq
from itertools import product, chain

import rdflib
import simplejson

NS = type('Namespaces', (dict,), {
    '__getattr__': (lambda self, key: self[key]),
})({
    'fabio': rdflib.Namespace('http://purl.org/spar/fabio/'),
    'prism': rdflib.Namespace('http://prismstandard.org/namespaces/basic/2.0'),
    'dcterms': rdflib.Namespace('http://purl.org/dc/terms/'),
    'rdf': rdflib.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    'c4o': rdflib.Namespace('http://purl.org/spar/c4o/'),
})

class CitoParser(object):
    _WORK_TYPES = set(map(NS.fabio.__getitem__, ['JournalArticle', 'ReportDocument', 'ResearchPaper', 'Document', 'Book']))

    def __init__(self, f):
        if not hasattr(f, 'read'):
            f = open(f, 'r')
        self._graph = rdflib.ConjunctiveGraph()
        self._graph.parse(f, format='n3')

    def get_label(self, uri):
        #if isinstance(uri, rdflib.URIRef):
        return hashlib.sha1(uri).hexdigest()

    def get_works(self):
        works = self._graph.query("""\
            SELECT ?uri ?citation ?date WHERE {
                ?uri prism:publicationDate ?date ;
                     dcterms:bibliographicCitation ?citation 
            }""", initNs = NS)

        for uri, citation, date in works:
            citefreq = map(lambda xs:int(xs[0]), self._graph.query("""\
                SELECT ?value WHERE {
                    ?work c4o:hasglobalCitationFrequency ?x .
                    ?x c4o:hasGlobalCountValue ?value
                }""", initBindings={'work': uri}, initNs = NS))


            types = set(self._graph.objects(uri, NS.rdf['type']))
            if not (types & self._WORK_TYPES):
                continue

            yield {
                'type': 'Work',
                'label': self.get_label(uri),
                'citation': citation,
                'date': date,
                'citationCount': (sum(citefreq) / len(citefreq)) if citefreq else 1,
                'rdf_type': [t.rsplit('/')[-1] for t in types],
            }

    def get_citations(self):
        citations = self._graph.query("""\
            SELECT ?citefreq ?citing ?cited ?count WHERE {
                ?citing c4o:hasInTextCitationFrequency ?citefreq .
                ?citefreq a c4o:InTextCitationCount ;
                          c4o:hasInTextCountValue ?count ;
                          c4o:hasInTextCitationTarget ?cited .
            }""", initNs = NS)

        for citefreq, citing, cited, count in citations:
            yield {
                'type': 'Citation',
                'citing': self.get_label(citing),
                'cited': self.get_label(cited),
                'count': count,
                'label': self.get_label(citefreq),
            }

if __name__ == '__main__':
    parser = CitoParser(sys.argv[1])
    items = list(chain(parser.get_works(), parser.get_citations()))

    print simplejson.dumps({
        'items': items,
    }, indent=2)
