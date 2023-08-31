namespace ApiConverter.Services;

public interface IDefaultOutputMock
{
    public Dictionary<string, string> Get();

    public void Set(Dictionary<string, string> map);
}


public interface IApiDefaultOutputMock : IDefaultOutputMock
{
}


public interface IUpDefaultOutputMock : IDefaultOutputMock
{
}
