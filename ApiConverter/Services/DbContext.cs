using Microsoft.Data.Sqlite;
using System.Data;

namespace ApiConverter.Services;

public class DbContext
{
    protected readonly IConfiguration Configuration;

    public DbContext(IConfiguration configuration) => Configuration = configuration;

    public IDbConnection CreateConnection() => new SqliteConnection("Data Source=sqlite.db");
}