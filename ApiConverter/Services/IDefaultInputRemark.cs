namespace ApiConverter.Services;


public interface IDefaultInputRemark
{
    public Dictionary<string, string> Get();

    public void Set(Dictionary<string, string> map);
}

public interface IApiDefaultInputRemark : IDefaultInputRemark
{
}

public interface IUpDefaultInputRemark : IDefaultInputRemark
{
}