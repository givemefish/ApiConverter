using System.Data.Common;
using Microsoft.Data.Sqlite;

namespace ApiConverter.Code;

public class ConnectionStrings : Dictionary<string, string>
{
    public ConnectionStrings()
    {
        DbProviderFactories.RegisterFactory("Sqlite", SqliteFactory.Instance);
    }

    public bool Validate()
    {
        List<Exception> errors = new();
        foreach ((string key, string connectionString) in this)
        {
            try
            {
                DbProviderFactory factory = DbProviderFactories.GetFactory(key);
                using DbConnection? connection = factory.CreateConnection();
                if (connection is null)
                {
                    throw new ApplicationException($"\"{key}\" did not have a valid database provider registered");
                }

                connection.ConnectionString = connectionString;
                connection.Open();
            }
            catch (Exception ex)
            {
                errors.Add(ex);
            }
        }

        return !errors.Any();
    }
}