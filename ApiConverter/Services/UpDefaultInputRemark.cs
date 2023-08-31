using Dapper;
using Microsoft.Extensions.Caching.Memory;
using System.Data;

namespace ApiConverter.Services;

public class UpDefaultInputRemark : IUpDefaultInputRemark
{
    private readonly DbContext _context;
    private readonly IMemoryCache _cache;
    private const string CACHE_KEY = nameof(UpDefaultInputRemark);

    public UpDefaultInputRemark(DbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public Dictionary<string, string> Get()
    {
        return _cache.GetOrCreate(CACHE_KEY, entry =>
        {
            using IDbConnection conn = _context.CreateConnection();
            Dictionary<string, string> res = conn.Query("SELECT * FROM UpDefaultInputRemark ORDER BY ID")
                .ToDictionary(o => (string)o.Key, o => (string)o.Value);
            conn.Close();

            entry.SetSlidingExpiration(TimeSpan.FromMinutes(20));

            return res;
        });
    }

    public void Set(Dictionary<string, string> map)
    {
        using IDbConnection conn = _context.CreateConnection();
        conn.Open();

        using IDbTransaction trans = conn.BeginTransaction();

        conn.Execute("DELETE FROM UpDefaultInputRemark", transaction: trans);

        DynamicParameters parameters = new();
        var i = 1;
        foreach (KeyValuePair<string, string> kv in map)
        {
            parameters.Add("@id", i++);
            parameters.Add("@key", kv.Key);
            parameters.Add("@value", kv.Value);
            conn.Execute("INSERT INTO UpDefaultInputRemark (ID, Key, Value) VALUES(@id, @key, @value)", parameters, transaction: trans);
        }
        trans.Commit();

        _cache.Remove(CACHE_KEY);

        conn.Close();
    }
}