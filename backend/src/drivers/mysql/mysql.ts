import mysql, { PoolConnection } from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
})

type Executor = Pick<PoolConnection, 'query'> | typeof pool

export type QueryClientContract = MySqlClient
export type TransactionClientContract = MySqlClient

class MySqlClient {
  public constructor(private readonly executor: Executor) {}

  public async rawQuery(sql: string, bindings: unknown[] = []) {
    const [rows] = await this.executor.query(sql, bindings)
    return [rows]
  }
}

const client = new MySqlClient(pool)

const Database = {
  connection: () => client,
  rawQuery: (sql: string, bindings: unknown[] = []) => client.rawQuery(sql, bindings),
  transaction: async <T>(callback: (transaction: MySqlClient) => Promise<T>) => {
    const connection = await pool.getConnection()
    const transaction = new MySqlClient(connection)
    try {
      await connection.beginTransaction()
      const result = await callback(transaction)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  },
  close: () => pool.end(),
}

export default Database
