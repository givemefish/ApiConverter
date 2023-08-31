using Microsoft.Extensions.Options;

namespace ApiConverter.Code;

public static class ConnectionStringExtensions
{
    public static OptionsBuilder<ConnectionStrings>
        ValidateConnectionStrings(this IServiceCollection services)
    {
        return services
            .AddOptions<ConnectionStrings>()
            .BindConfiguration("ConnectionStrings")
            .Validate(c => c.Validate(), "Could not connect to 1 or more databases.");
    }
}