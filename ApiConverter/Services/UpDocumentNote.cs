using Dapper;
using System.Data;
using Microsoft.Extensions.Caching.Memory;

namespace ApiConverter.Services;

public class UpDocumentNote : IUpDocumentNote
{
    private readonly DbContext _context;
    private readonly IMemoryCache _cache;
    private const string CACHE_KEY = nameof(UpDocumentNote);

    public UpDocumentNote(DbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public string[] Get()
    {
        return _cache.GetOrCreate(CACHE_KEY, entry =>
        {
            using IDbConnection conn = _context.CreateConnection();
            string[] res = conn.Query("SELECT * FROM UpDocumentNote")
                .Select(o => (string)o.Value)
                .ToArray();

            conn.Close();

            entry.SetSlidingExpiration(TimeSpan.FromMinutes(20));

            return res;
        });
    }

    public void Set(string[] list)
    {
        using IDbConnection conn = _context.CreateConnection();
        conn.Open();

        using IDbTransaction trans = conn.BeginTransaction();

        conn.Execute("DELETE FROM UpDocumentNote", transaction: trans);

        DynamicParameters parameters = new();
        for (var i = 0; i < list.Length; i++)
        {
            parameters.Add("@key", i);
            parameters.Add("@value", list[i]);
            conn.Execute("INSERT INTO UpDocumentNote (Key, Value) VALUES(@key, @value)", parameters, transaction: trans);
        }

        trans.Commit();

        _cache.Remove(CACHE_KEY);

        conn.Close();
    }
}