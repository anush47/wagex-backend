"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is missing in environment (Bun should load .env)');
    process.exit(1);
}
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Verifying Company fields...');
    try {
        const company = await prisma.company.create({
            data: {
                name: 'Test Company with Fields',
                employerNumber: 'EMP-TEST-001',
                address: '123 Test St',
                startedDate: new Date(),
                logo: 'https://test.com/logo.png',
                files: [{ key: 'doc1', name: 'Test Doc', url: 'http://test.com/doc1' }]
            }
        });
        console.log('Successfully Created Company:', JSON.stringify(company, null, 2));
        if (company.employerNumber !== 'EMP-TEST-001')
            throw new Error('employerNumber mismatch');
        if (company.address !== '123 Test St')
            throw new Error('address mismatch');
        await prisma.company.delete({ where: { id: company.id } });
        console.log('Cleaned up test data.');
    }
    catch (e) {
        console.error('Verification failed:', e);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=verify-company.js.map