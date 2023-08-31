namespace ApiConverter.Services;

public interface IDefaultOutputRemark
{
    public Dictionary<string, string> Get();

    public void Set(Dictionary<string, string> map);
}

public interface IApiDefaultOutputRemark : IDefaultOutputRemark
{
}

public interface IUpDefaultOutputRemark : IDefaultOutputRemark
{
}