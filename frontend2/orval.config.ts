import { defineConfig } from 'orval';

export default defineConfig({
    militaryJournal: {
        output: {
            mode: 'tags-split',
            schemas: 'src/api/client/model',
            client: 'react-query',
            target: 'src/api/client/militaryJournal.ts',
            override: {
                mutator: {
                    path: 'src/api/custom-instance.ts',
                    name: 'customInstance',
                },
            },
        },
        input: {
            target: 'http://127.0.0.1:8000/openapi.json'
        },
    },
});