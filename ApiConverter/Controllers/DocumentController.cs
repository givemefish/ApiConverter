using System.Diagnostics;
using System.Net.Mime;
using ApiConverter.Code;
using ApiConverter.Models;
using ApiConverter.Services;
using Microsoft.AspNetCore.Mvc;

namespace ApiConverter.Controllers
{
    public class DocumentController : Controller
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IDocumentGenerator _documentGenerator;
        private readonly IApiDocumentNote _apiDocumentNote;
        private readonly IApiDefaultInputRemark _apiDefaultInputRemark;
        private readonly IApiDefaultInputMock _apiDefaultInputMock;
        private readonly IApiDefaultOutputRemark _apiDefaultOutputRemark;
        private readonly IApiDefaultOutputMock _apiDefaultOutputMock;

        private readonly IUpDocumentNote _upDocumentNote;
        private readonly IUpDefaultInputRemark _upDefaultInputRemark;
        private readonly IUpDefaultInputMock _upDefaultInputMock;
        private readonly IUpDefaultOutputRemark _upDefaultOutputRemark;
        private readonly IUpDefaultOutputMock _upDefaultOutputMock;

        public DocumentController(IHttpContextAccessor httpContextAccessor,
            IDocumentGenerator documentGenerator, 
            IApiDocumentNote apiDocumentNote, 
            IApiDefaultInputRemark apiDefaultInputRemark,
            IApiDefaultInputMock apiDefaultInputMock,
            IApiDefaultOutputRemark apiDefaultOutputRemark, 
            IApiDefaultOutputMock apiDefaultOutputMock,
            IUpDocumentNote upDocumentNote,
            IUpDefaultInputRemark upDefaultInputRemark,
            IUpDefaultInputMock upDefaultInputMock,
            IUpDefaultOutputRemark upDefaultOutputRemark,
            IUpDefaultOutputMock upDefaultOutputMock)
        {
            _httpContextAccessor = httpContextAccessor;
            _documentGenerator = documentGenerator;
            _apiDocumentNote = apiDocumentNote;
            _apiDefaultInputRemark = apiDefaultInputRemark;
            _apiDefaultInputMock = apiDefaultInputMock;
            _apiDefaultOutputRemark = apiDefaultOutputRemark;
            _apiDefaultOutputMock = apiDefaultOutputMock;
            _upDocumentNote = upDocumentNote;
            _upDefaultInputRemark = upDefaultInputRemark;
            _upDefaultOutputRemark = upDefaultOutputRemark;
            _upDefaultInputMock = upDefaultInputMock;
            _upDefaultOutputMock = upDefaultOutputMock;
        }

        public IActionResult Index()
        {
            string baseUrl = _httpContextAccessor.HttpContext?.Request.BaseUrl() ?? "/ApiConverter/";
            if (!baseUrl.EndsWith("/"))
            {
                baseUrl += "/";
            }

            ViewBag.BaseUrl = baseUrl;

            return View();
        }

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetApiDocumentNote()
        {
            return Json(_apiDocumentNote.Get());
        }

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetApiDefaultInputRemark() => Json(_apiDefaultInputRemark.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetApiDefaultInputMock() => Json(_apiDefaultInputMock.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetApiDefaultOutputRemark() => Json(_apiDefaultOutputRemark.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetApiDefaultOutputMock() => Json(_apiDefaultOutputMock.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetUpDocumentNote() => Json(_upDocumentNote.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetUpDefaultInputRemark() => Json(_upDefaultInputRemark.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetUpDefaultInputMock() => Json(_upDefaultInputMock.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetUpDefaultOutputRemark() => Json(_upDefaultOutputRemark.Get());

        [ApiExceptionFilter]
        [HttpGet]
        public IActionResult GetUpDefaultOutputMock() => Json(_upDefaultOutputMock.Get());

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetApiDocumentNote(string[] list)
        {
            _apiDocumentNote.Set(list);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetApiDefaultInputRemark(Dictionary<string, string> map)
        {
            _apiDefaultInputRemark.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetApiDefaultInputMock(Dictionary<string, string> map)
        {
            _apiDefaultInputMock.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetApiDefaultOutputRemark(Dictionary<string, string> map)
        {
            _apiDefaultOutputRemark.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetApiDefaultOutputMock(Dictionary<string, string> map)
        {
            _apiDefaultOutputMock.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetUpDocumentNote(string[] list)
        {
            _upDocumentNote.Set(list);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetUpDefaultInputRemark(Dictionary<string, string> map)
        {
            _upDefaultInputRemark.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetUpDefaultInputMock(Dictionary<string, string> map)
        {
            _upDefaultInputMock.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetUpDefaultOutputRemark(Dictionary<string, string> map)
        {
            _upDefaultOutputRemark.Set(map);
            return Ok();
        }

        [ApiExceptionFilter]
        [HttpPost]
        public IActionResult SetUpDefaultOutputMock(Dictionary<string, string> map)
        {
            _upDefaultOutputMock.Set(map);
            return Ok();
        }

        [HttpPost]
        public IActionResult Convert(string json)
        {
            try
            {
                byte[] bytes = _documentGenerator.Generate(json);
                return File(bytes, MediaTypeNames.Application.Octet);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult BrowserNotSupported() => View();
    }
}