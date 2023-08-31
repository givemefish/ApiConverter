namespace ApiConverter.Services;

public interface IDefaultInputMock
{
    public Dictionary<string, string> Get();

    public void Set(Dictionary<string, string> map);
}


public interface IApiDefaultInputMock : IDefaultInputMock
{
}


public interface IUpDefaultInputMock : IDefaultInputMock
{
}
